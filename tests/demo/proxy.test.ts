// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isPublicPath } from "@/proxy";

describe("route protection", () => {
  it.each([
    "/",
    "/demo",
    "/login",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/demo/access",
    "/api/demo/session",
    "/api/demo/generate",
    "/api/cron/demo-cleanup",
  ])("keeps %s public", (path) => {
    expect(isPublicPath(path)).toBe(true);
  });

  it.each([
    "/demos",
    "/demo/extra",
    "/api/admin/demo-codes",
    "/api/demo",
    "/api/cron/other",
  ])("protects %s", (path) => {
    expect(isPublicPath(path)).toBe(false);
  });
});
