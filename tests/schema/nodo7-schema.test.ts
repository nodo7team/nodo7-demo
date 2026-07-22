// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/0001_nodo7_demo_access.sql",
  "utf8",
).toLowerCase();

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
});
