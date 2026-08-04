-- Each access code decides, at issue time, what the visitor will receive:
-- a username/password line, or an activation code redeemed inside the app.
-- Codes issued before this migration keep behaving as lines.
alter table demo_access_codes
  add column credential_type text not null default 'line'
    check (credential_type in ('line','activecode'));

-- demo_requests deliberately does not repeat the credential type: it belongs to
-- exactly one access code, which is its single source of truth.
--
-- The encrypted columns hold whichever secret the demo produced. For a line
-- that is the password; for an activation code it is the code itself, and
-- username stays null because the panel issues none.
comment on column demo_requests.username is
  'Public half of the credential. Null for activation codes.';
comment on column demo_requests.password_ciphertext is
  'Encrypted secret: the line password, or the activation code.';

-- create_activecode returns no exp_date, so provider_expires_at stays null for
-- activation codes. The previous rule compared that null against now(), which is
-- never true, and those secrets would have been kept forever.
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
