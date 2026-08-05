// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/0001_nodo7_demo_access.sql",
  "utf8",
).toLowerCase();

function credentialTypeMigration(): string {
  return readFileSync(
    "supabase/migrations/0002_demo_credential_type.sql",
    "utf8",
  ).toLowerCase();
}

function whatsappMigration(): string {
  return readFileSync(
    "supabase/migrations/0003_demo_whatsapp_delivery.sql",
    "utf8",
  ).toLowerCase();
}

describe("NODO7 schema", () => {
  it("contains only the demo domain tables", () => {
    expect(sql).toContain("create table demo_access_codes");
    expect(sql).toContain("create table demo_requests");
    expect(sql).toContain("create table demo_activation_attempts");
    expect(sql).not.toMatch(
      /create table (clients|lines|sales|message_templates)/,
    );
  });

  it("enforces one request per access code and atomic activation", () => {
    expect(sql).toContain("access_code_id uuid not null unique");
    expect(sql).toContain("create or replace function activate_demo_code");
    expect(sql).toContain("status = 'pending'");
  });

  it("keeps browser roles away from tables and privileged functions", () => {
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("revoke all on function activate_demo_code");
    expect(sql).toContain("grant execute on function activate_demo_code");
    expect(sql).toContain("to service_role");
  });

  it("completes a provider result and consumes its code in one transaction", () => {
    expect(sql).toContain("provider_external_id text");
    expect(sql).toContain("create or replace function complete_demo_generation");
    expect(sql).toContain("set status = 'used'");
    expect(sql).toContain("set status = 'ok'");
  });
});

describe("NODO7 credential type migration", () => {
  it("adds the credential type without touching the codes already issued", () => {
    const migration = credentialTypeMigration();
    expect(migration).toContain("alter table demo_access_codes");
    expect(migration).toContain("add column");
    expect(migration).toContain("credential_type text not null default 'line'");
    expect(migration).toContain(
      "check (credential_type in ('line','activecode'))",
    );
  });

  it("redacts secrets that never receive a provider expiration", () => {
    const migration = credentialTypeMigration();
    expect(migration).toContain(
      "create or replace function redact_demo_audit",
    );
    expect(migration).toContain("provider_expires_at is null");
    expect(migration).toContain("interval '7 days'");
  });
});

describe("NODO7 WhatsApp delivery migration", () => {
  it("stores the visitor phone and what happened to the message", () => {
    const migration = whatsappMigration();
    expect(migration).toContain("alter table demo_requests");
    expect(migration).toContain("phone text");
    expect(migration).toContain(
      "check (delivery_status in ('pending','sent','failed','disabled'))",
    );
  });

  it("leaves codes issued before this migration untouched", () => {
    expect(whatsappMigration()).toContain("default 'pending'");
  });

  it("redacts the phone like the rest of the personal data", () => {
    const migration = whatsappMigration();
    expect(migration).toContain("create or replace function redact_demo_audit");
    expect(migration).toContain("phone = null");
    expect(migration).toContain("interval '90 days'");
  });

  it("keeps clearing secrets that never receive an expiration", () => {
    // The 0002 rule must survive this redefinition of the same function.
    const migration = whatsappMigration();
    expect(migration).toContain("provider_expires_at is null");
    expect(migration).toContain("interval '7 days'");
  });
});
