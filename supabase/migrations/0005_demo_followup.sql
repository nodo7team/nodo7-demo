-- After a demo burns out nothing happened, which is exactly the moment the
-- visitor has an opinion. These columns let a scheduled job ask them how it
-- went, once and only once.

alter table demo_requests
  add column followup_sent_at timestamptz,
  add column followup_status text
    check (followup_status in ('sent', 'failed'));

comment on column demo_requests.followup_sent_at is
  'Stamped when the row is claimed, before the message leaves. A duplicate
   marketing message is worse than a missing one, so this is never cleared
   and a failed send is not retried.';
comment on column demo_requests.followup_status is
  'What happened to the claimed message. Null means it is still in flight or
   the run died between claiming and recording.';

-- Only the rows still owing a follow-up are worth indexing; the table is
-- mostly rows that already had theirs.
create index demo_requests_followup_pending_idx
  on demo_requests(completed_at)
  where followup_sent_at is null;

/**
 * Claims rows for one run. The caller decides which demos are due, because
 * the package durations live in the application and must not be duplicated
 * here; this only guarantees that two overlapping runs cannot claim the same
 * row twice.
 */
create or replace function claim_demo_followups(
  p_ids uuid[],
  p_now timestamptz
) returns setof uuid
language sql security definer set search_path = public as $$
  update demo_requests
     set followup_sent_at = p_now, updated_at = now()
   where id = any(p_ids)
     and followup_sent_at is null
     and status = 'ok'
  returning id;
$$;

create or replace function record_demo_followup(
  p_id uuid,
  p_status text
) returns boolean
language sql security definer set search_path = public as $$
  update demo_requests
     set followup_status = p_status, updated_at = now()
   where id = p_id
     and p_status in ('sent', 'failed')
  returning true;
$$;

revoke all on function claim_demo_followups(uuid[], timestamptz)
  from public, anon, authenticated;
grant execute on function claim_demo_followups(uuid[], timestamptz)
  to service_role;

revoke all on function record_demo_followup(uuid, text)
  from public, anon, authenticated;
grant execute on function record_demo_followup(uuid, text) to service_role;

-- Redefines the 0004 function so the cleanup also forgets who was followed up
-- once the phone itself is gone from the request. The contact list in
-- demo_customers is untouched: consent, not a timer, decides how long it
-- stays.
create or replace function redact_demo_audit()
returns integer
language plpgsql security definer set search_path = public as $$
declare affected integer := 0;
declare changed integer;
begin
  update demo_requests
     set password_ciphertext = null,
         password_iv = null,
         password_tag = null,
         updated_at = now()
   where (
           provider_expires_at <= now()
           or (
             provider_expires_at is null
             and created_at <= now() - interval '7 days'
           )
         )
     and password_ciphertext is not null;
  get diagnostics affected = row_count;

  update demo_access_codes
     set activation_ip = null, updated_at = now()
   where created_at <= now() - interval '90 days' and activation_ip is not null;
  get diagnostics changed = row_count;
  affected := affected + changed;

  delete from demo_activation_attempts
   where created_at <= now() - interval '90 days';
  get diagnostics changed = row_count;
  return affected + changed;
end;
$$;

revoke all on function redact_demo_audit()
  from public, anon, authenticated;
grant execute on function redact_demo_audit() to service_role;
