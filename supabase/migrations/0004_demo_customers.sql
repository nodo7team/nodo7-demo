-- The portal stops being only an audit trail and starts building a customer
-- list: the visitor now also gives an email and an explicit consent to be
-- contacted, and the same person coming back twice is one customer with two
-- demos instead of two unrelated rows.

create table demo_customers (
  id uuid primary key default gen_random_uuid(),
  -- The phone is the identity. It is checked against WhatsApp before any demo
  -- is created, while the email is only ever typed, so the phone is the only
  -- field known to reach a real person.
  phone text not null unique,
  email text not null check (position('@' in email) > 1),
  name text not null check (char_length(name) between 2 and 80),
  country_iso text check (country_iso ~ '^[A-Z]{2}$'),
  marketing_consent boolean not null default false,
  consent_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table demo_customers is
  'Contact list built from demo requests. Kept beyond the audit window because
   the visitor consented to it; delete a row to honour an erasure request.';
comment on column demo_customers.phone is
  'Canonical digits, the same form used to deliver over WhatsApp.';
comment on column demo_customers.marketing_consent is
  'False means the row predates consent or it was never given: do not contact.';

-- The request keeps its own copy of what was submitted, so the audit trail
-- still reads correctly if the customer is later erased.
alter table demo_requests
  add column customer_id uuid references demo_customers(id) on delete set null,
  add column email text;

comment on column demo_requests.customer_id is
  'Null for requests created before this migration, or after an erasure.';

create index demo_customers_last_seen_idx on demo_customers(last_seen_at desc);
create index demo_customers_email_idx on demo_customers(lower(email));
create index demo_requests_customer_idx on demo_requests(customer_id);

alter table demo_customers enable row level security;
revoke all on table demo_customers from anon, authenticated;
grant all on table demo_customers to service_role;

-- One round trip that creates the customer or refreshes what we know about
-- them. Returns the id so the request can be linked in the same flow.
create or replace function upsert_demo_customer(
  p_phone text,
  p_email text,
  p_name text,
  p_country_iso text,
  p_consent boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare matched_id uuid;
begin
  insert into demo_customers (
    phone, email, name, country_iso, marketing_consent, consent_at
  ) values (
    p_phone, p_email, p_name, p_country_iso, p_consent,
    case when p_consent then now() else null end
  )
  on conflict (phone) do update
     set email = excluded.email,
         name = excluded.name,
         country_iso = coalesce(excluded.country_iso, demo_customers.country_iso),
         -- A later visit may add consent but never silently take it back, and
         -- the date that matters is the first time it was given.
         marketing_consent =
           demo_customers.marketing_consent or excluded.marketing_consent,
         consent_at = coalesce(demo_customers.consent_at, excluded.consent_at),
         last_seen_at = now(),
         updated_at = now()
  returning id into matched_id;
  return matched_id;
end;
$$;

revoke all on function upsert_demo_customer(text,text,text,text,boolean)
  from public, anon, authenticated;
grant execute on function upsert_demo_customer(text,text,text,text,boolean)
  to service_role;

-- Redefines the 0003 function to stop erasing the phone. Contact data is now
-- the product of this table, kept on consent instead of expiring; erasure is a
-- delete on demo_customers, not a timer. Everything that protects the demo
-- itself is untouched: the credentials still go at 7 days or on expiry, and
-- the activation IP and the attempt log still go at 90.
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

-- Requests created before this migration are deliberately not backfilled into
-- demo_customers: those visitors were told their number would be erased and
-- never agreed to be contacted.
