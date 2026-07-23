// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createAdminCodeHandlers } from "@/app/api/admin/demo-codes/route";
import { createRevokeHandler } from "@/app/api/admin/demo-codes/[id]/revoke/route";
import { createCleanupHandler } from "@/app/api/cron/demo-cleanup/route";
import type { AccessCodeWithRequest } from "@/lib/demo/repository";

function record(status: AccessCodeWithRequest["status"]): AccessCodeWithRequest {
  return {
    id: "code-1",
    codeHash: "secret-hash",
    displaySuffix: "ABCD",
    status,
    sessionHash: "session-hash",
    generationAttemptCount: 1,
    activationIp: "203.0.113.9",
    activatedAt: "2026-07-22T12:00:00.000Z",
    sessionDeadline: "2026-07-22T12:10:00.000Z",
    usedAt: status === "used" ? "2026-07-22T12:01:00.000Z" : null,
    revokedAt: null,
    createdAt: "2026-07-22T11:00:00.000Z",
    updatedAt: "2026-07-22T12:01:00.000Z",
    request: null,
  };
}

describe("admin demo routes", () => {
  it("rejects unauthenticated listing and creation", async () => {
    const handlers = createAdminCodeHandlers({
      authenticate: vi.fn().mockResolvedValue(false),
      service: {
        createAdminCode: vi.fn(),
        listAdminCodes: vi.fn(),
      },
    });
    const request = new NextRequest("https://nodo7.example/api/admin/demo-codes");
    expect((await handlers.GET(request)).status).toBe(401);
    expect((await handlers.POST(request)).status).toBe(401);
  });

  it("returns plaintext only when a new code is created", async () => {
    const created = record("pending");
    const handlers = createAdminCodeHandlers({
      authenticate: vi.fn().mockResolvedValue(true),
      service: {
        createAdminCode: vi.fn().mockResolvedValue({
          code: "N7-ABCD-EFGH-JKLM-NPQR-STUV",
          record: created,
        }),
        listAdminCodes: vi.fn(),
      },
    });
    const response = await handlers.POST(
      new NextRequest("https://nodo7.example/api/admin/demo-codes", {
        method: "POST",
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.code).toMatch(/^N7-/);
    expect(body.record.status).toBe("pending");
    expect(body.record.codeHash).toBeUndefined();
    expect(body.record.sessionHash).toBeUndefined();
  });

  it("validates status, search, and the 200-row limit", async () => {
    const listAdminCodes = vi.fn().mockResolvedValue([record("active")]);
    const handlers = createAdminCodeHandlers({
      authenticate: vi.fn().mockResolvedValue(true),
      service: { createAdminCode: vi.fn(), listAdminCodes },
    });
    const response = await handlers.GET(
      new NextRequest(
        "https://nodo7.example/api/admin/demo-codes?status=active&search=ABCD&limit=500",
      ),
    );
    expect(response.status).toBe(200);
    expect(listAdminCodes).toHaveBeenCalledWith({
      status: "active",
      search: "ABCD",
      limit: 200,
    });
  });

  it("returns a conflict when a terminal code cannot be revoked", async () => {
    const handler = createRevokeHandler({
      authenticate: vi.fn().mockResolvedValue(true),
      revokeAdminCode: vi.fn().mockResolvedValue(false),
    });
    const response = await handler(
      new NextRequest("https://nodo7.example/api/admin/demo-codes/code-1/revoke", {
        method: "POST",
      }),
      "code-1",
    );
    expect(response.status).toBe(409);
  });

  it("protects cleanup with the Vercel cron secret", async () => {
    const cleanupDemoData = vi.fn().mockResolvedValue({ expired: 2, redacted: 3 });
    const handler = createCleanupHandler({ secret: "cron-secret", cleanupDemoData });
    const denied = await handler(
      new NextRequest("https://nodo7.example/api/cron/demo-cleanup"),
    );
    expect(denied.status).toBe(401);
    const allowed = await handler(
      new NextRequest("https://nodo7.example/api/cron/demo-cleanup", {
        headers: { authorization: "Bearer cron-secret" },
      }),
    );
    expect(allowed.status).toBe(200);
    expect(cleanupDemoData).toHaveBeenCalledTimes(1);
  });
});
