# NODO7 Demo Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a focused NODO7 portal where one-use codes unlock a server-controlled 10-minute session for entering a name, choosing a 1-hour FULL or 4-hour demo, and generating exactly one demo, plus an authenticated console for code administration.

**Architecture:** Replace the copied business suite with two bounded surfaces: public demo redemption and authenticated demo administration. Store lifecycle state in a minimal Supabase schema, keep code/session/credential cryptography in server-only services, and isolate the not-yet-supplied IPTV API behind a `DemoProvider` interface so branding and security can be completed without hard-coding client credentials.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5.6, Supabase/PostgreSQL, Zod, JOSE, Node `crypto`, TanStack Query, Tailwind CSS, Vitest, Testing Library.

## Global Constraints

- Work only in `C:\Users\HP\Pictures\Proyectos_Emprendimientos\OptiMind_IA\NODO7_IPTV_PANEL`; never modify the original `iptv-panel` folder.
- Initialize a new Git history in NODO7; do not copy or connect the original repository history.
- A pending code has no countdown and remains valid until first redemption or administrator revocation.
- First valid redemption atomically consumes the code and starts one server-controlled 10-minute session.
- The visitor provides only a name and selects package `7` (`1 hora FULL`) or package `6` (`4 horas`).
- Successful generation is allowed once; afterward the same browser may only read the result until the original deadline.
- The post-generation session is result-only: it can reveal the stored result to the original cookie but can never call the provider again.
- Expired, used, or revoked codes are never reset or reused.
- Codes contain at least 96 bits of cryptographic entropy and only keyed hashes are stored.
- Activation permits at most 10 failed attempts per IP in a rolling 10-minute window.
- Generation permits at most three submissions per active session.
- Demo session cookies are opaque, HTTP-only, `SameSite=Strict`, and `Secure` in production.
- Provider credentials and credential-encryption keys exist only in server environment variables.
- The finished product exposes no customer, paid-line, reseller, sales, renewal, credit, template, Raptor, or general synchronization modules.
- The client's final provider contract is not invented; an explicit disabled provider remains the default until real API documentation and secrets arrive.

## File Structure

### Core domain

- `lib/demo/types.ts`: stable domain types and public/admin response shapes.
- `lib/demo/secrets.ts`: random code/token generation, keyed hashes, and credential encryption.
- `lib/demo/lifecycle.ts`: pure lifecycle decisions and deadline calculations.
- `lib/demo/repository.ts`: Supabase persistence and atomic RPC calls.
- `lib/demo/session.ts`: secure demo-session cookie creation and validation.
- `lib/demo/service.ts`: activation, generation, result retrieval, revocation, and cleanup orchestration.
- `lib/demo/provider.ts`: `DemoProvider` contract and disabled-provider default.
- `lib/demo/providers/clicktv.ts`: temporary compatibility adapter, enabled only by explicit environment configuration.

### Routes and UI

- `app/api/demo/access/route.ts`: redeem a code.
- `app/api/demo/session/route.ts`: return current session state/result.
- `app/api/demo/generate/route.ts`: validate name/package and generate once.
- `app/api/admin/demo-codes/route.ts`: authenticated code list and creation.
- `app/api/admin/demo-codes/[id]/revoke/route.ts`: authenticated revocation.
- `app/api/cron/demo-cleanup/route.ts`: expire sessions, clear expired passwords, and redact old audit data.
- `app/demo/page.tsx`: public state-machine shell.
- `components/demo/*`: access form, setup form, timer, and result components.
- `app/(authed)/demos/page.tsx`: focused operational console.
- `components/admin/AdminShell.tsx`: NODO7 admin navigation and logout.

### Data and tests

- `supabase/migrations/0001_nodo7_demo_access.sql`: complete clean schema and atomic activation function.
- `supabase/tests/database/demo_access.test.sql`: pgTAP verification of atomic activation and function permissions.
- `tests/demo/*.test.ts`: domain, services, route security, and provider behavior.
- `tests/components/*.test.tsx`: public and admin UI behavior.
- `tests/schema/nodo7-schema.test.ts`: schema invariants.

---

### Task 1: Establish the Independent NODO7 Baseline and Test Harness

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Create: `public/brand/nodo7-logo.png`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: the clean copied source tree and `C:\Users\HP\Pictures\MEmu Photo\logonodo7.png`
- Produces: an independent Git repository and `npm.cmd run test`, `npm.cmd run typecheck`, and `npm.cmd run check`

- [ ] **Step 1: Initialize independent version control and record the untouched baseline**

Run:

```powershell
git init -b main
git add .
git commit -m "chore: establish independent NODO7 baseline"
```

Expected: a new root commit inside `NODO7_IPTV_PANEL`; the original repository status remains unchanged.

- [ ] **Step 2: Copy the supplied logo into a stable public asset path**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'public\brand'
Copy-Item -LiteralPath 'C:\Users\HP\Pictures\MEmu Photo\logonodo7.png' -Destination 'public\brand\nodo7-logo.png'
Get-FileHash -Algorithm SHA256 'C:\Users\HP\Pictures\MEmu Photo\logonodo7.png','public\brand\nodo7-logo.png'
```

Expected: both SHA-256 values match.

- [ ] **Step 3: Install the test dependencies**

Run:

```powershell
npm.cmd install --save-dev vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom supabase
```

Expected: exit code 0 and lockfile updated.

- [ ] **Step 4: Add deterministic scripts and Vitest configuration**

Set the scripts in `package.json` to:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "typecheck": "tsc --noEmit",
  "check": "npm run test && npm run typecheck && npm run build",
  "set-pin": "tsx scripts/set-pin.ts"
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
});
```

Create `tests/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Verify the empty harness and commit**

Run:

```powershell
npm.cmd run test -- --passWithNoTests
npm.cmd run typecheck
git add package.json package-lock.json vitest.config.ts tests/setup.ts public/brand/nodo7-logo.png .gitignore
git commit -m "test: add NODO7 verification harness"
```

Expected: both commands pass and the commit succeeds.

---

### Task 2: Implement Domain Types, Lifecycle, and Secret Handling

**Files:**
- Create: `lib/demo/types.ts`
- Create: `lib/demo/lifecycle.ts`
- Create: `lib/demo/secrets.ts`
- Test: `tests/demo/lifecycle.test.ts`
- Test: `tests/demo/secrets.test.ts`

**Interfaces:**
- Produces: `AccessCodeStatus`, `DemoPackageId`, `DemoSessionView`, `startDeadline(now)`, `classifyAccess(code, now)`, `generateAccessCode()`, `hashSecret(value)`, `encryptCredential(value)`, and `decryptCredential(payload)`

- [ ] **Step 1: Write failing lifecycle tests**

Create `tests/demo/lifecycle.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { classifyAccess, startDeadline } from '@/lib/demo/lifecycle';

describe('demo lifecycle', () => {
  const now = new Date('2026-07-22T12:00:00.000Z');

  it('starts exactly ten minutes after activation', () => {
    expect(startDeadline(now).toISOString()).toBe('2026-07-22T12:10:00.000Z');
  });

  it('keeps pending codes timeless', () => {
    expect(classifyAccess({ status: 'pending', sessionDeadline: null }, now)).toBe('pending');
  });

  it('expires active codes at the server deadline', () => {
    expect(classifyAccess({ status: 'active', sessionDeadline: '2026-07-22T11:59:59.000Z' }, now)).toBe('expired');
  });
});
```

- [ ] **Step 2: Write failing secret-handling tests**

Create `tests/demo/secrets.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { decryptCredential, encryptCredential, generateAccessCode, hashSecret } from '@/lib/demo/secrets';

beforeEach(() => {
  process.env.DEMO_HASH_SECRET = 'h'.repeat(64);
  process.env.DEMO_CREDENTIALS_KEY = Buffer.alloc(32, 7).toString('base64');
});

describe('demo secrets', () => {
  it('generates a grouped code with at least twenty random base32 characters', () => {
    expect(generateAccessCode()).toMatch(/^N7(?:-[A-Z2-9]{4}){5}$/);
  });

  it('hashes deterministically without returning plaintext', () => {
    expect(hashSecret('N7-AAAA-BBBB-CCCC-DDDD-EEEE')).toMatch(/^[a-f0-9]{64}$/);
  });

  it('round-trips encrypted credentials', () => {
    const encrypted = encryptCredential('secret-password');
    expect(encrypted.ciphertext).not.toContain('secret-password');
    expect(decryptCredential(encrypted)).toBe('secret-password');
  });
});
```

- [ ] **Step 3: Run the tests and verify that missing modules fail**

Run:

```powershell
npm.cmd run test -- tests/demo/lifecycle.test.ts tests/demo/secrets.test.ts
```

Expected: FAIL because the domain modules do not exist.

- [ ] **Step 4: Implement the minimal domain contracts**

Define in `lib/demo/types.ts`:

```ts
export type AccessCodeStatus = 'pending' | 'active' | 'used' | 'expired' | 'revoked';
export type DemoRequestStatus = 'creating' | 'error' | 'ambiguous' | 'ok';
export type DemoPackageId = 6 | 7;

export interface EncryptedCredential {
  ciphertext: string;
  iv: string;
  tag: string;
}

export interface DemoResultView {
  username: string;
  password: string;
  packageId: DemoPackageId;
  packageName: string;
  expiresAt: string | null;
}

export type DemoSessionView =
  | { state: 'none' | 'expired' }
  | { state: 'setup'; deadline: string; remainingSeconds: number }
  | { state: 'result'; deadline: string; remainingSeconds: number; result: DemoResultView };
```

Implement `startDeadline()` as `now + 600_000`, make `classifyAccess()` expire only active records past that deadline, generate 20 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, use HMAC-SHA256 with `DEMO_HASH_SECRET`, and use AES-256-GCM with a 32-byte base64 `DEMO_CREDENTIALS_KEY`.

- [ ] **Step 5: Run tests and commit**

Run:

```powershell
npm.cmd run test -- tests/demo/lifecycle.test.ts tests/demo/secrets.test.ts
npm.cmd run typecheck
git add lib/demo tests/demo
git commit -m "feat: add secure demo access domain"
```

Expected: all new tests pass.

---

### Task 3: Replace the Inherited Database with the Minimal NODO7 Schema

**Files:**
- Delete: all existing files under `supabase/migrations/`
- Create: `supabase/config.toml`
- Create: `supabase/migrations/0001_nodo7_demo_access.sql`
- Create: `supabase/tests/database/demo_access.test.sql`
- Test: `tests/schema/nodo7-schema.test.ts`

**Interfaces:**
- Produces: `demo_access_codes`, `demo_requests`, `demo_activation_attempts`, `activate_demo_code(text,text,text)`, `expire_demo_sessions()`, and `redact_demo_audit()`

- [ ] **Step 1: Write the schema-invariant test before replacing migrations**

Create `tests/schema/nodo7-schema.test.ts`:

```ts
// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync('supabase/migrations/0001_nodo7_demo_access.sql', 'utf8').toLowerCase();

describe('NODO7 schema', () => {
  it('contains only the demo domain tables', () => {
    expect(sql).toContain('create table demo_access_codes');
    expect(sql).toContain('create table demo_requests');
    expect(sql).toContain('create table demo_activation_attempts');
    expect(sql).not.toMatch(/create table (clients|lines|sales|message_templates)/);
  });

  it('enforces one request per access code and atomic activation', () => {
    expect(sql).toContain('access_code_id uuid not null unique');
    expect(sql).toContain('create or replace function activate_demo_code');
    expect(sql).toContain("status = 'pending'");
  });
});
```

- [ ] **Step 2: Run the test and verify that the clean schema is missing**

Run:

```powershell
npm.cmd run test -- tests/schema/nodo7-schema.test.ts
```

Expected: FAIL because `0001_nodo7_demo_access.sql` does not exist.

- [ ] **Step 3: Replace inherited migrations with the complete clean schema**

Initialize the local Supabase project once:

```powershell
npx.cmd supabase init
```

Expected: `supabase/config.toml` is created without changing the existing specification or tests.

The new SQL must define these exact columns and checks:

```sql
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

alter table demo_access_codes enable row level security;
alter table demo_requests enable row level security;
alter table demo_activation_attempts enable row level security;
```

Add indexes for code status, deadlines, request status, provider expiration, and activation-attempt IP/time. Do not create anon/authenticated RLS policies; all access goes through server-only service role routes.

- [ ] **Step 4: Add the atomic activation and cleanup functions**

`activate_demo_code` must perform one update and return only the row it activated:

```sql
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
```

Add the remaining lifecycle functions:

```sql
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
     set password_ciphertext = null, password_iv = null, password_tag = null, updated_at = now()
   where provider_expires_at <= now() and password_ciphertext is not null;
  get diagnostics affected = row_count;

  update demo_access_codes
     set activation_ip = null, updated_at = now()
   where created_at <= now() - interval '90 days' and activation_ip is not null;
  get diagnostics changed = row_count;
  affected := affected + changed;

  delete from demo_activation_attempts where created_at <= now() - interval '90 days';
  get diagnostics changed = row_count;
  return affected + changed;
end;
$$;

create index demo_access_codes_status_idx on demo_access_codes(status);
create index demo_access_codes_deadline_idx on demo_access_codes(session_deadline);
create index demo_requests_status_idx on demo_requests(status);
create index demo_requests_expiration_idx on demo_requests(provider_expires_at);
create index demo_activation_attempts_ip_time_idx on demo_activation_attempts(ip, created_at desc);
```

Explicitly restrict every security-definer function:

```sql
revoke execute on function activate_demo_code(text,text,text) from public, anon, authenticated;
grant execute on function activate_demo_code(text,text,text) to service_role;
revoke execute on function claim_demo_generation_attempt(text) from public, anon, authenticated;
grant execute on function claim_demo_generation_attempt(text) to service_role;
revoke execute on function expire_demo_sessions() from public, anon, authenticated;
grant execute on function expire_demo_sessions() to service_role;
revoke execute on function redact_demo_audit() from public, anon, authenticated;
grant execute on function redact_demo_audit() to service_role;
```

- [ ] **Step 5: Add pgTAP coverage for real PostgreSQL behavior**

Create `supabase/tests/database/demo_access.test.sql`:

```sql
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into demo_access_codes (code_hash, display_suffix)
values ('test-code-hash', 'A5HZ');

select results_eq(
  $$select count(*)::bigint from activate_demo_code('test-code-hash','test-session-hash','203.0.113.10')$$,
  $$values (1::bigint)$$,
  'first activation returns one row'
);

select results_eq(
  $$select count(*)::bigint from activate_demo_code('test-code-hash','second-session','203.0.113.11')$$,
  $$values (0::bigint)$$,
  'second activation returns no row'
);

select ok(
  (select abs(extract(epoch from (session_deadline - activated_at)) - 600) <= 2
     from demo_access_codes where code_hash = 'test-code-hash'),
  'deadline is ten minutes after activation'
);

select is(claim_demo_generation_attempt('test-session-hash'), 1, 'first generation attempt is claimed');
select is(claim_demo_generation_attempt('test-session-hash'), 2, 'second generation attempt is claimed');
select is(claim_demo_generation_attempt('test-session-hash'), 3, 'third generation attempt is claimed');
select is(claim_demo_generation_attempt('test-session-hash'), null::integer, 'fourth attempt is rejected');

set local role anon;
select throws_ok(
  $$select * from activate_demo_code('x','y','z')$$,
  'anon cannot activate codes directly'
);
select throws_ok(
  $$select claim_demo_generation_attempt('y')$$,
  'anon cannot claim generation attempts directly'
);
reset role;

set local role authenticated;
select throws_ok(
  $$select * from activate_demo_code('x','y','z')$$,
  'authenticated cannot activate codes directly'
);
select throws_ok(
  $$select claim_demo_generation_attempt('y')$$,
  'authenticated cannot claim generation attempts directly'
);
reset role;

select * from finish();
rollback;
```

- [ ] **Step 6: Verify the schema and commit**

Run:

```powershell
npm.cmd run test -- tests/schema/nodo7-schema.test.ts
npx.cmd supabase start
npx.cmd supabase db reset
npx.cmd supabase test db
npx.cmd supabase stop
rg -n -i "clients|paid|sales|raptor|message_templates" supabase\migrations
git add supabase/config.toml supabase/migrations supabase/tests tests/schema
git commit -m "feat: add minimal NODO7 demo schema"
```

Expected: test passes; `rg` returns no matches; commit succeeds.

---

### Task 4: Implement Repository, Session, and Access Services

**Files:**
- Create: `lib/demo/repository.ts`
- Create: `lib/demo/session.ts`
- Create: `lib/demo/service.ts`
- Test: `tests/demo/service.test.ts`

**Interfaces:**
- Consumes: Task 2 secrets/types and Task 3 schema
- Produces: `activateAccessCode(input)`, `getSessionView(token)`, `createAdminCode()`, `listAdminCodes(filters)`, `revokeAdminCode(id)`, and `cleanupDemoData()`

- [ ] **Step 1: Write failing service tests with an in-memory repository double**

Cover these exact cases in `tests/demo/service.test.ts`:

```ts
it('does not assign a deadline when an admin creates a code', async () => {
  const created = await service.createAdminCode();
  expect(created.code).toMatch(/^N7-/);
  expect(created.record.status).toBe('pending');
  expect(created.record.sessionDeadline).toBeNull();
});

it('starts one ten-minute session and rejects a second activation', async () => {
  const first = await service.activateAccessCode({ code, ip: '203.0.113.4', now });
  expect(first.deadline).toBe('2026-07-22T12:10:00.000Z');
  await expect(service.activateAccessCode({ code, ip: '203.0.113.5', now })).rejects.toMatchObject({ publicCode: 'CODE_UNAVAILABLE' });
});

it('blocks the eleventh failed activation from the same IP', async () => {
  repository.failedAttempts = 10;
  await expect(service.activateAccessCode({ code: 'wrong', ip: '203.0.113.4', now })).rejects.toMatchObject({ publicCode: 'RATE_LIMITED' });
});
```

Also test resume-by-session-token, server expiration, used-result retrieval, revocation, and generic errors.

- [ ] **Step 2: Run the service tests and verify failure**

Run:

```powershell
npm.cmd run test -- tests/demo/service.test.ts
```

Expected: FAIL because service modules are missing.

- [ ] **Step 3: Define a repository boundary and Supabase implementation**

Use this interface in `lib/demo/repository.ts`:

```ts
export interface DemoRepository {
  createCode(input: { codeHash: string; displaySuffix: string }): Promise<AccessCodeRecord>;
  activateCode(input: { codeHash: string; sessionHash: string; ip: string }): Promise<AccessCodeRecord | null>;
  countFailedActivations(ip: string, since: string): Promise<number>;
  recordActivationAttempt(input: ActivationAttempt): Promise<void>;
  findBySessionHash(sessionHash: string): Promise<AccessCodeWithRequest | null>;
  claimGenerationAttempt(sessionHash: string): Promise<number | null>;
  listCodes(filters: AdminCodeFilters): Promise<AccessCodeWithRequest[]>;
  revokeCode(id: string): Promise<boolean>;
  expireSessions(): Promise<number>;
  redactAudit(): Promise<number>;
}
```

The Supabase implementation calls `activate_demo_code` for the atomic transition and never queries plaintext codes.

- [ ] **Step 4: Implement the opaque session cookie helper**

Use cookie name `nodo7_demo_session`, a 32-byte random token, keyed hashing before database storage, `httpOnly: true`, `sameSite: 'strict'`, `path: '/'`, `maxAge: 600`, and `secure: process.env.NODE_ENV === 'production'`. The root path is required so the browser sends the same cookie to both `/demo` and `/api/demo/*`.

Expose pure helpers for tests and Next cookie adapters for routes:

```ts
export const DEMO_SESSION_COOKIE = 'nodo7_demo_session';
export function createDemoSessionToken(): { token: string; tokenHash: string };
export function demoSessionCookie(token: string): CookieOptions;
```

- [ ] **Step 5: Implement the access service and verify**

The service must normalize codes to uppercase, remove spaces, enforce the rolling IP limit before activation, return the same `CODE_UNAVAILABLE` public code for invalid/used/expired/revoked values, and classify deadlines from server time.

Run:

```powershell
npm.cmd run test -- tests/demo/service.test.ts
npm.cmd run typecheck
git add lib/demo tests/demo/service.test.ts
git commit -m "feat: add one-use access and session services"
```

Expected: tests and typecheck pass.

---

### Task 5: Add Public Activation and Session APIs with Exact Route Protection

**Files:**
- Delete: `app/api/demo/route.ts`
- Create: `app/api/demo/access/route.ts`
- Create: `app/api/demo/session/route.ts`
- Delete: `middleware.ts`
- Create: `proxy.ts`
- Test: `tests/demo/public-routes.test.ts`
- Test: `tests/demo/proxy.test.ts`

**Interfaces:**
- Consumes: Task 4 services
- Produces: `POST /api/demo/access`, `GET /api/demo/session`, and exact public-route rules

- [ ] **Step 1: Write failing route and middleware tests**

Test these contracts:

```ts
expect(await postAccess({ code: 'N7-VALID' })).toMatchObject({ status: 200, body: { state: 'setup' } });
expect(accessCookie.httpOnly).toBe(true);
expect(accessCookie.sameSite).toBe('strict');
expect(await postAccess({ code: 'bad' })).toMatchObject({ status: 404, body: { error: 'Código inválido o no disponible.' } });
expect(isPublicPath('/demo')).toBe(true);
expect(isPublicPath('/api/demo/access')).toBe(true);
expect(isPublicPath('/demos')).toBe(false);
expect(isPublicPath('/api/admin/demo-codes')).toBe(false);
```

- [ ] **Step 2: Run the route tests and verify failure**

Run:

```powershell
npm.cmd run test -- tests/demo/public-routes.test.ts tests/demo/proxy.test.ts
```

Expected: FAIL because the routes and exact matcher do not exist.

- [ ] **Step 3: Implement activation and session routes**

`POST /api/demo/access` accepts only:

```ts
const AccessSchema = z.object({ code: z.string().min(8).max(64) });
```

It gets the trusted proxy IP, calls `activateAccessCode`, sets the session cookie, and returns `{ state: 'setup', deadline, remainingSeconds: 600 }`. `GET /api/demo/session` reads the opaque cookie and returns the `DemoSessionView`; it never accepts a session token in query parameters or JSON.

- [ ] **Step 4: Replace deprecated middleware and prefix bypasses with an exact Next.js 16 proxy**

Export and test:

```ts
const PUBLIC_EXACT = new Set([
  '/', '/demo', '/login',
  '/api/auth/login', '/api/auth/logout',
  '/api/demo/access', '/api/demo/session', '/api/demo/generate',
]);

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_EXACT.has(pathname) || pathname === '/api/cron/demo-cleanup';
}
```

Export the request handler as `export async function proxy(req: NextRequest)`. This follows the Next.js 16 file convention and explicitly fixes the inherited `/demo` prefix bug that also matched protected `/demos`.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm.cmd run test -- tests/demo/public-routes.test.ts tests/demo/proxy.test.ts
npm.cmd run typecheck
git add app/api/demo proxy.ts middleware.ts tests/demo
git commit -m "feat: add protected one-use demo entry API"
```

Expected: all specified tests pass.

---

### Task 6: Isolate Provider Generation and Enforce Idempotent Single Use

**Files:**
- Create: `lib/demo/provider.ts`
- Create: `lib/demo/providers/clicktv.ts`
- Create: `lib/demo/generation.ts`
- Create: `app/api/demo/generate/route.ts`
- Test: `tests/demo/generation.test.ts`
- Test: `tests/demo/generate-route.test.ts`

**Interfaces:**
- Produces: `DemoProvider.createDemo(input)`, `getDemoProvider()`, `generateDemoForSession(input)`, and `POST /api/demo/generate`

- [ ] **Step 1: Write failing provider and generation tests**

Use this contract:

```ts
export interface DemoProviderInput {
  name: string;
  packageId: 6 | 7;
  idempotencyKey: string;
}

export interface DemoProviderResult {
  externalId: string;
  username: string;
  password: string;
  expiresAt: string | null;
  packageName: string;
}

export interface DemoProvider {
  createDemo(input: DemoProviderInput): Promise<DemoProviderResult>;
}
```

Tests must prove one successful call, same idempotency key on explicit retry, maximum three submissions, no call after deadline, no call after success, encrypted password storage, and `ambiguous` status on unknown provider outcome.

- [ ] **Step 2: Run generation tests and verify failure**

Run:

```powershell
npm.cmd run test -- tests/demo/generation.test.ts tests/demo/generate-route.test.ts
```

Expected: FAIL because generation modules are absent.

- [ ] **Step 3: Implement the provider boundary without inventing the client's API**

`getDemoProvider()` returns a disabled provider unless `DEMO_PROVIDER=clicktv`. The disabled provider throws a typed `PROVIDER_NOT_CONFIGURED` error. The compatibility adapter wraps only the inherited ClickTV `create_line` operation and maps package 6 or 7; it does not expose paid-line operations.

- [ ] **Step 4: Implement generation orchestration and route validation**

Use:

```ts
const GenerateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  packageId: z.union([z.literal(6), z.literal(7)]),
});
```

The route obtains the session exclusively from the cookie and claims one generation submission before validating the request body, so malformed, explicit-failure, and valid submissions all count toward the maximum of three. `generateDemoForSession()` creates or reuses one request row, preserves its idempotency key, encrypts successful passwords, marks the code `used`, and returns the decrypted result only to the authorized session. Public errors are sanitized.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm.cmd run test -- tests/demo/generation.test.ts tests/demo/generate-route.test.ts
npm.cmd run typecheck
git add lib/demo app/api/demo/generate tests/demo
git commit -m "feat: generate one idempotent demo per code"
```

Expected: all generation tests pass.

---

### Task 7: Build the Branded Public NODO7 Demo Portal

**Files:**
- Replace: `app/demo/page.tsx`
- Create: `components/demo/DemoPortal.tsx`
- Create: `components/demo/AccessCodeForm.tsx`
- Create: `components/demo/DemoSetupForm.tsx`
- Create: `components/demo/DemoCountdown.tsx`
- Create: `components/demo/DemoResult.tsx`
- Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Test: `tests/components/demo-portal.test.tsx`

**Interfaces:**
- Consumes: Task 5 session/access APIs and Task 6 generation API
- Produces: accessible `code -> setup -> result/expired` public state machine

- [ ] **Step 1: Write failing component tests with fake timers and mocked fetch**

Test the complete visitor behavior:

```tsx
render(<DemoPortal initialSession={{ state: 'none' }} />);
await user.type(screen.getByLabelText(/código de acceso/i), 'N7-VALID');
await user.click(screen.getByRole('button', { name: /continuar/i }));
expect(await screen.findByLabelText(/nombre/i)).toBeVisible();
expect(screen.getByRole('radio', { name: /1 hora full/i })).toBeVisible();
expect(screen.getByRole('radio', { name: /4 horas/i })).toBeVisible();
expect(screen.getByText('10:00')).toBeVisible();
```

Also test required name, one selected package, countdown from server deadline, reload result state, disabled generation during submission, copied credentials, and expired state at `00:00`.

- [ ] **Step 2: Run the component test and verify failure**

Run:

```powershell
npm.cmd run test -- tests/components/demo-portal.test.tsx
```

Expected: FAIL because the new components do not exist.

- [ ] **Step 3: Implement the public state machine**

`DemoPortal` owns only these states and always refreshes authoritative state from `/api/demo/session`:

```ts
type PortalState =
  | { kind: 'access' }
  | { kind: 'setup'; deadline: string }
  | { kind: 'result'; deadline: string; result: DemoResultView }
  | { kind: 'expired' };
```

The countdown computes `Math.max(0, deadlineMs - Date.now())`, never extends the deadline locally, displays `MM:SS`, and announces expiry with `aria-live="polite"`.

- [ ] **Step 4: Apply NODO7 branding and routing**

Use `/brand/nodo7-logo.png` with descriptive alt text, replace ClickTV/OptiMind metadata with `NODO7 | Demos IPTV`, make `/` redirect to `/demo`, and define accessible green/lime tokens that preserve at least WCAG AA text contrast on light and dark backgrounds.

- [ ] **Step 5: Verify public UI and commit**

Run:

```powershell
npm.cmd run test -- tests/components/demo-portal.test.tsx
npm.cmd run typecheck
git add app components/demo tests/components public/brand
git commit -m "feat: build branded NODO7 demo portal"
```

Expected: component tests and typecheck pass.

---

### Task 8: Build the Focused Administrative Console and Cleanup Job

**Files:**
- Replace: `app/(authed)/demos/page.tsx`
- Replace: `app/(authed)/layout.tsx`
- Create: `components/admin/AdminShell.tsx`
- Create: `components/admin/CodeGenerator.tsx`
- Create: `components/admin/CodeTable.tsx`
- Create: `lib/demo/admin-client.ts`
- Create: `app/api/admin/demo-codes/route.ts`
- Create: `app/api/admin/demo-codes/[id]/revoke/route.ts`
- Create: `app/api/cron/demo-cleanup/route.ts`
- Modify: `app/login/page.tsx`
- Modify: `app/login/LoginForm.tsx`
- Modify: `vercel.json`
- Test: `tests/demo/admin-routes.test.ts`
- Test: `tests/components/admin-console.test.tsx`

**Interfaces:**
- Consumes: Task 4 administration/cleanup services
- Produces: authenticated code operations and scheduled cleanup

- [ ] **Step 1: Write failing admin authorization and UI tests**

Prove that unauthenticated API calls return 401, code creation returns plaintext only once, revocation accepts only pending/active codes, filters cover all five statuses, copy action uses the newly returned code, and used/expired rows offer `Crear reemplazo` rather than reset.

Example:

```ts
expect(await postAdminCode({ authenticated: false })).toMatchObject({ status: 401 });
expect(await postAdminCode({ authenticated: true })).toMatchObject({
  status: 201,
  body: { code: expect.stringMatching(/^N7-/), record: { status: 'pending' } },
});
expect(await revokeAdminCode({ status: 'used' })).toMatchObject({ status: 409 });
```

- [ ] **Step 2: Run the admin tests and verify failure**

Run:

```powershell
npm.cmd run test -- tests/demo/admin-routes.test.ts tests/components/admin-console.test.tsx
```

Expected: FAIL because the focused admin routes/components do not exist.

- [ ] **Step 3: Implement authenticated administration routes**

`GET /api/admin/demo-codes` accepts `status`, `search`, and `limit <= 200`. `POST` creates one code. `POST /api/admin/demo-codes/:id/revoke` revokes only pending or active records. Every handler verifies the administrator session inside the route in addition to middleware.

- [ ] **Step 4: Implement the operational console**

The page contains:

```ts
const STATUS_FILTERS = ['all', 'pending', 'active', 'used', 'expired', 'revoked'] as const;
```

It shows code suffix, state, creation/activation/deadline timestamps, visitor name, package, provider username, expiration, IP, sanitized result, and actions to copy a newly generated plaintext code, revoke, refresh, or create a replacement. It does not display decorative conversion metrics.

- [ ] **Step 5: Rebrand administrator login/shell and schedule cleanup**

The shell links only to `/demos` and logout. Successful PIN login navigates to `/demos`. `vercel.json` schedules `/api/cron/demo-cleanup` hourly (`0 * * * *`), and the route requires `Authorization: Bearer ${CRON_SECRET}` before calling `cleanupDemoData()`.

- [ ] **Step 6: Verify and commit**

Run:

```powershell
npm.cmd run test -- tests/demo/admin-routes.test.ts tests/components/admin-console.test.tsx
npm.cmd run typecheck
git add app components/admin lib/demo/admin-client.ts vercel.json tests
git commit -m "feat: add NODO7 demo administration console"
```

Expected: admin tests and typecheck pass.

---

### Task 9: Remove Unused Business Modules, Document Configuration, and Verify End to End

**Files:**
- Delete: unrelated pages under `app/(authed)/` except `layout.tsx` and `demos/page.tsx`
- Delete: unrelated API routes under `app/api/` except auth, demo, admin demo-code, and demo cleanup routes
- Delete: `lib/platforms/clicktv.ts`, `lib/platforms/raptor.ts`, `lib/platforms/sheets.ts`, `lib/platforms/sync.ts`, legacy hooks/utilities, and business-only components
- Replace: `types/index.ts` with NODO7-only re-exports
- Replace: `.env.example`
- Replace: `README.md`
- Modify: `public/manifest.json`
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `tests/project-scope.test.ts`

**Interfaces:**
- Consumes: all prior tasks
- Produces: a minimal documented NODO7 source tree that builds without inherited business modules

- [ ] **Step 1: Write the project-scope regression test**

Create `tests/project-scope.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('NODO7 product scope', () => {
  it.each([
    'app/(authed)/clients', 'app/(authed)/lines', 'app/(authed)/sales',
    'app/(authed)/templates', 'app/(authed)/settings',
    'app/api/clients', 'app/api/lines', 'app/api/raptor', 'app/api/sales',
    'lib/platforms/clicktv.ts', 'lib/platforms/raptor.ts', 'lib/platforms/sheets.ts',
  ])('does not ship %s', (path) => expect(existsSync(path)).toBe(false));

  it('ships only NODO7 manifest copy', () => {
    const manifest = readFileSync('public/manifest.json', 'utf8');
    expect(manifest).toContain('NODO7');
    expect(manifest).not.toMatch(/OptiMind|Raptor|ClickTV/i);
  });
});
```

- [ ] **Step 2: Run the scope test and verify inherited modules fail it**

Run:

```powershell
npm.cmd run test -- tests/project-scope.test.ts
```

Expected: FAIL while inherited modules still exist.

- [ ] **Step 3: Delete unreachable product modules and unused dependencies**

Remove all customer, paid-line, sales, renewals, credits, templates, general activity, Raptor, Google Sheets, and synchronization files. Remove `googleapis`, `recharts`, and `tough-cookie` after `rg` confirms no remaining imports:

```powershell
rg -n "googleapis|recharts|tough-cookie" app components lib types
npm.cmd uninstall googleapis recharts tough-cookie
```

Expected: the first command returns no required remaining imports after pruning; uninstall succeeds.

- [ ] **Step 4: Replace configuration and documentation with exact NODO7 requirements**

`.env.example` must contain keys with empty example values only:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
APP_PIN_HASH=
SESSION_SECRET=
DEMO_HASH_SECRET=
DEMO_CREDENTIALS_KEY=
DEMO_PROVIDER=disabled
XUI_BASE_URL=
XUI_API_KEY=
CRON_SECRET=
```

`README.md` documents local setup, PIN/hash/key generation commands, Supabase migration application, provider-disabled behavior, tests, build, and Vercel/Cloudflare secret configuration boundaries. It must state that the real client API adapter is added only after receiving its contract.

Set `package.json` name to `nodo7-demo-portal`, set the manifest `name` to `NODO7 Demos`, `short_name` to `NODO7`, `start_url` to `/demo`, and remove all OptiMind, ClickTV, and Raptor metadata.

- [ ] **Step 5: Run the complete automated verification**

Run:

```powershell
npm.cmd run test
npx.cmd supabase start
npx.cmd supabase db reset
npx.cmd supabase test db
npx.cmd supabase stop
npm.cmd run typecheck
npm.cmd run build
git diff --check
```

Expected: all tests pass, TypeScript has zero errors, production build succeeds, and `git diff --check` reports no whitespace errors.

- [ ] **Step 6: Verify critical behavior in a local browser**

Run `npm.cmd run dev`, then verify at desktop and mobile widths:

1. `/demo` shows NODO7 logo and code form.
2. Invalid codes share one generic error.
3. Valid activation starts at 10:00 and survives reload without resetting.
4. Name and either 1-hour FULL or 4-hour selection are required.
5. Provider-disabled generation produces a safe operational error without exposing secrets.
6. `/demos` redirects unauthenticated visitors to `/login`.
7. Admin login lands on `/demos`, creates/copies/revokes codes, and exposes no unrelated navigation.
8. Keyboard focus, timer announcement, loading, empty, error, and mobile states are usable.

- [ ] **Step 7: Confirm original isolation and commit the finished baseline**

Run:

```powershell
git status --short
git -C 'C:\Users\HP\Pictures\Proyectos_Emprendimientos\OptiMind_IA\iptv-panel' status --short
git add .
git commit -m "feat: complete secure NODO7 demo portal"
```

Expected: NODO7 changes commit successfully; the original still shows only its pre-existing `.claude/settings.local.json` modification.
