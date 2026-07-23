create extension if not exists pgcrypto;

create table demo_access_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  display_suffix text not null,
  status text not null default 'pending'
    check (status in ('pending','active','used','expired','revoked')),
  session_hash text unique,
  generation_attempt_count int not null default 0
    check (generation_attempt_count between 0 and 3),
  activation_ip text,
  activated_at timestamptz,
  session_deadline timestamptz,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table demo_requests (
  id uuid primary key default gen_random_uuid(),
  access_code_id uuid not null unique references demo_access_codes(id) on delete restrict,
  name text not null check (char_length(name) between 2 and 80),
  package_id int not null check (package_id in (6,7)),
  provider_idempotency_key uuid not null default gen_random_uuid() unique,
  status text not null default 'creating'
    check (status in ('creating','error','ambiguous','ok')),
  attempt_count int not null default 1 check (attempt_count between 1 and 3),
  provider_external_id text,
  username text,
  password_ciphertext text,
  password_iv text,
  password_tag text,
  provider_expires_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table demo_activation_attempts (
  id bigint generated always as identity primary key,
  code_fingerprint text not null,
  ip text not null,
  success boolean not null,
  error_code text,
  created_at timestamptz not null default now()
);

create index demo_access_codes_status_idx on demo_access_codes(status);
create index demo_access_codes_deadline_idx on demo_access_codes(session_deadline);
create index demo_requests_status_idx on demo_requests(status);
create index demo_requests_expiration_idx on demo_requests(provider_expires_at);
create index demo_activation_attempts_ip_time_idx
  on demo_activation_attempts(ip, created_at desc);

alter table demo_access_codes enable row level security;
alter table demo_requests enable row level security;
alter table demo_activation_attempts enable row level security;

revoke all on table demo_access_codes from anon, authenticated;
revoke all on table demo_requests from anon, authenticated;
revoke all on table demo_activation_attempts from anon, authenticated;
revoke all on sequence demo_activation_attempts_id_seq from anon, authenticated;

grant all on table demo_access_codes to service_role;
grant all on table demo_requests to service_role;
grant all on table demo_activation_attempts to service_role;
grant all on sequence demo_activation_attempts_id_seq to service_role;

create or replace function activate_demo_code(
  p_code_hash text,
  p_session_hash text,
  p_ip text
) returns setof demo_access_codes
language sql security definer set search_path = public as $$
  update demo_access_codes
     set status = 'active',
         session_hash = p_session_hash,
         activation_ip = p_ip,
         activated_at = now(),
         session_deadline = now() + interval '10 minutes',
         updated_at = now()
   where code_hash = p_code_hash
     and status = 'pending'
  returning *;
$$;

create or replace function claim_demo_generation_attempt(p_session_hash text)
returns integer
language sql security definer set search_path = public as $$
  update demo_access_codes
     set generation_attempt_count = generation_attempt_count + 1,
         updated_at = now()
   where session_hash = p_session_hash
     and status = 'active'
     and session_deadline > now()
     and generation_attempt_count < 3
  returning generation_attempt_count;
$$;

create or replace function complete_demo_generation(
  p_session_hash text,
  p_request_id uuid,
  p_external_id text,
  p_username text,
  p_password_ciphertext text,
  p_password_iv text,
  p_password_tag text,
  p_expires_at timestamptz
) returns boolean
language plpgsql security definer set search_path = public as $$
declare claimed_code_id uuid;
begin
  update demo_access_codes
     set status = 'used', used_at = now(), updated_at = now()
   where session_hash = p_session_hash
     and status = 'active'
     and session_deadline > now()
     and exists (
       select 1 from demo_requests
        where id = p_request_id
          and access_code_id = demo_access_codes.id
          and status = 'creating'
     )
  returning id into claimed_code_id;

  if claimed_code_id is null then
    return false;
  end if;

  update demo_requests
     set status = 'ok',
         provider_external_id = p_external_id,
         username = p_username,
         password_ciphertext = p_password_ciphertext,
         password_iv = p_password_iv,
         password_tag = p_password_tag,
         provider_expires_at = p_expires_at,
         error_code = null,
         completed_at = now(),
         updated_at = now()
   where id = p_request_id and access_code_id = claimed_code_id;
  if not found then
    raise exception 'demo request completion failed';
  end if;
  return true;
end;
$$;

create or replace function expire_demo_sessions()
returns integer
language plpgsql security definer set search_path = public as $$
declare affected integer;
begin
  update demo_access_codes
     set status = 'expired', updated_at = now()
   where status = 'active' and session_deadline <= now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;

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
   where provider_expires_at <= now() and password_ciphertext is not null;
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

revoke all on function activate_demo_code(text,text,text)
  from public, anon, authenticated;
grant execute on function activate_demo_code(text,text,text) to service_role;

revoke all on function claim_demo_generation_attempt(text)
  from public, anon, authenticated;
grant execute on function claim_demo_generation_attempt(text) to service_role;

revoke all on function complete_demo_generation(
  text,uuid,text,text,text,text,text,timestamptz
) from public, anon, authenticated;
grant execute on function complete_demo_generation(
  text,uuid,text,text,text,text,text,timestamptz
) to service_role;

revoke all on function expire_demo_sessions()
  from public, anon, authenticated;
grant execute on function expire_demo_sessions() to service_role;

revoke all on function redact_demo_audit()
  from public, anon, authenticated;
grant execute on function redact_demo_audit() to service_role;
