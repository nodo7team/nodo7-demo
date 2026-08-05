-- The visitor now provides a phone number, and the credentials are delivered
-- over WhatsApp. Requests created before this migration keep a null phone and
-- a pending status, which reads as "nothing was ever attempted".
alter table demo_requests
  add column phone text,
  add column delivery_status text not null default 'pending'
    check (delivery_status in ('pending','sent','failed','disabled'));

comment on column demo_requests.phone is
  'Visitor phone in canonical digits. Personal data, redacted after 90 days.';
comment on column demo_requests.delivery_status is
  'sent means the panel accepted the message, never that it was delivered.';

create index demo_requests_delivery_idx on demo_requests(delivery_status);

-- Redefines the 0002 function to also clear the phone. The rule for secrets
-- without a provider expiration has to survive intact.
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

  update demo_requests
     set phone = null, updated_at = now()
   where created_at <= now() - interval '90 days' and phone is not null;
  get diagnostics changed = row_count;
  affected := affected + changed;

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

-- Records the delivery outcome without touching the credentials themselves.
create or replace function record_demo_delivery(
  p_request_id uuid,
  p_status text
) returns boolean
language sql security definer set search_path = public as $$
  update demo_requests
     set delivery_status = p_status, updated_at = now()
   where id = p_request_id
     and p_status in ('pending','sent','failed','disabled')
  returning true;
$$;

revoke all on function record_demo_delivery(uuid, text)
  from public, anon, authenticated;
grant execute on function record_demo_delivery(uuid, text) to service_role;
