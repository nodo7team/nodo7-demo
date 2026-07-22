import { beforeEach, describe, expect, it } from "vitest";
import {
  createDemoService,
  type DemoAccessService,
} from "@/lib/demo/service";
import type {
  AccessCodeRecord,
  AccessCodeWithRequest,
  ActivationAttempt,
  AdminCodeFilters,
  DemoRepository,
} from "@/lib/demo/repository";
import { encryptCredential, hashSecret } from "@/lib/demo/secrets";
import type { AccessCodeStatus } from "@/lib/demo/types";

const NOW = new Date("2026-07-22T12:00:00.000Z");

class InMemoryDemoRepository implements DemoRepository {
  records: AccessCodeWithRequest[] = [];
  attempts: ActivationAttempt[] = [];
  failedAttempts = 0;
  failAttemptAudit = false;
  now = NOW;

  async createCode(input: {
    codeHash: string;
    displaySuffix: string;
  }): Promise<AccessCodeRecord> {
    const record: AccessCodeWithRequest = {
      id: `code-${this.records.length + 1}`,
      codeHash: input.codeHash,
      displaySuffix: input.displaySuffix,
      status: "pending",
      sessionHash: null,
      generationAttemptCount: 0,
      activationIp: null,
      activatedAt: null,
      sessionDeadline: null,
      usedAt: null,
      revokedAt: null,
      createdAt: this.now.toISOString(),
      updatedAt: this.now.toISOString(),
      request: null,
    };
    this.records.push(record);
    return record;
  }

  async activateCode(input: {
    codeHash: string;
    sessionHash: string;
    ip: string;
  }): Promise<AccessCodeRecord | null> {
    const record = this.records.find(
      (candidate) =>
        candidate.codeHash === input.codeHash && candidate.status === "pending",
    );
    if (!record) return null;
    record.status = "active";
    record.sessionHash = input.sessionHash;
    record.activationIp = input.ip;
    record.activatedAt = this.now.toISOString();
    record.sessionDeadline = new Date(
      this.now.getTime() + 10 * 60 * 1_000,
    ).toISOString();
    record.updatedAt = this.now.toISOString();
    return record;
  }

  async countFailedActivations(): Promise<number> {
    return this.failedAttempts;
  }

  async recordActivationAttempt(input: ActivationAttempt): Promise<void> {
    if (this.failAttemptAudit) throw new Error("audit unavailable");
    this.attempts.push(input);
  }

  async findBySessionHash(
    sessionHash: string,
  ): Promise<AccessCodeWithRequest | null> {
    return (
      this.records.find((record) => record.sessionHash === sessionHash) ?? null
    );
  }

  async claimGenerationAttempt(): Promise<number | null> {
    return null;
  }

  async listCodes(filters: AdminCodeFilters): Promise<AccessCodeWithRequest[]> {
    return this.records.filter(
      (record) => !filters.status || record.status === filters.status,
    );
  }

  async revokeCode(id: string): Promise<boolean> {
    const record = this.records.find((candidate) => candidate.id === id);
    if (!record || !["pending", "active"].includes(record.status)) return false;
    record.status = "revoked";
    record.revokedAt = this.now.toISOString();
    return true;
  }

  async expireSessions(): Promise<number> {
    return 2;
  }

  async redactAudit(): Promise<number> {
    return 3;
  }
}

function makeUsedRecord(token: string): AccessCodeWithRequest {
  return {
    id: "used-code",
    codeHash: hashSecret("N7-USED-CODE"),
    displaySuffix: "CODE",
    status: "used",
    sessionHash: hashSecret(token),
    generationAttemptCount: 1,
    activationIp: "203.0.113.4",
    activatedAt: NOW.toISOString(),
    sessionDeadline: "2026-07-22T12:10:00.000Z",
    usedAt: "2026-07-22T12:01:00.000Z",
    revokedAt: null,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    request: {
      id: "request-1",
      accessCodeId: "used-code",
      name: "María",
      packageId: 7,
      providerIdempotencyKey: "00000000-0000-4000-8000-000000000001",
      status: "ok",
      attemptCount: 1,
      username: "demo-user",
      password: encryptCredential("demo-pass"),
      providerExpiresAt: "2026-07-22T13:01:00.000Z",
      errorCode: null,
      createdAt: NOW.toISOString(),
      completedAt: "2026-07-22T12:01:00.000Z",
      updatedAt: NOW.toISOString(),
    },
  };
}

describe("demo access service", () => {
  let repository: InMemoryDemoRepository;
  let service: DemoAccessService;

  beforeEach(() => {
    process.env.DEMO_HASH_SECRET = "h".repeat(64);
    process.env.DEMO_CREDENTIALS_KEY = Buffer.alloc(32, 7).toString("base64");
    repository = new InMemoryDemoRepository();
    service = createDemoService(repository);
  });

  it("does not assign a deadline when an admin creates a code", async () => {
    const created = await service.createAdminCode();
    expect(created.code).toMatch(/^N7-/);
    expect(created.record.status).toBe("pending");
    expect(created.record.sessionDeadline).toBeNull();
    expect(created.record.codeHash).not.toBe(created.code);
  });

  it("starts one ten-minute session and rejects a second activation", async () => {
    const { code } = await service.createAdminCode();
    const first = await service.activateAccessCode({
      code,
      ip: "203.0.113.4",
      now: NOW,
    });
    expect(first.deadline).toBe("2026-07-22T12:10:00.000Z");
    expect(first.token).toBeTruthy();

    await expect(
      service.activateAccessCode({
        code,
        ip: "203.0.113.5",
        now: NOW,
      }),
    ).rejects.toMatchObject({ publicCode: "CODE_UNAVAILABLE" });
  });

  it("blocks the eleventh failed activation from the same IP", async () => {
    repository.failedAttempts = 10;
    await expect(
      service.activateAccessCode({
        code: "wrong",
        ip: "203.0.113.4",
        now: NOW,
      }),
    ).rejects.toMatchObject({ publicCode: "RATE_LIMITED" });
    expect(repository.attempts).toHaveLength(0);
  });

  it("normalizes access codes and records only a fingerprint", async () => {
    const { code } = await service.createAdminCode();
    await service.activateAccessCode({
      code: `  ${code.toLowerCase()}  `,
      ip: "203.0.113.4",
      now: NOW,
    });
    expect(repository.attempts[0]).toMatchObject({ success: true });
    expect(repository.attempts[0].codeFingerprint).not.toContain(code);
  });

  it("does not strand a consumed code when audit recording fails", async () => {
    const { code } = await service.createAdminCode();
    repository.failAttemptAudit = true;
    await expect(
      service.activateAccessCode({
        code,
        ip: "203.0.113.4",
        now: NOW,
      }),
    ).resolves.toMatchObject({
      deadline: "2026-07-22T12:10:00.000Z",
      token: expect.any(String),
    });
  });

  it("resumes setup from the opaque session token", async () => {
    const { code } = await service.createAdminCode();
    const activated = await service.activateAccessCode({
      code,
      ip: "203.0.113.4",
      now: NOW,
    });
    await expect(
      service.getSessionView(activated.token, NOW),
    ).resolves.toMatchObject({
      state: "setup",
      deadline: "2026-07-22T12:10:00.000Z",
      remainingSeconds: 600,
    });
  });

  it("expires a session from server time", async () => {
    const { code } = await service.createAdminCode();
    const activated = await service.activateAccessCode({
      code,
      ip: "203.0.113.4",
      now: NOW,
    });
    await expect(
      service.getSessionView(
        activated.token,
        new Date("2026-07-22T12:10:00.000Z"),
      ),
    ).resolves.toEqual({ state: "expired" });
  });

  it("returns a successful result only until the original deadline", async () => {
    const token = "opaque-session-token";
    repository.records.push(makeUsedRecord(token));
    await expect(service.getSessionView(token, NOW)).resolves.toMatchObject({
      state: "result",
      result: {
        username: "demo-user",
        password: "demo-pass",
        packageId: 7,
        packageName: "1 hora FULL",
      },
    });
    await expect(
      service.getSessionView(
        token,
        new Date("2026-07-22T12:10:00.000Z"),
      ),
    ).resolves.toEqual({ state: "expired" });
  });

  it("revokes only pending or active codes", async () => {
    const pending = await service.createAdminCode();
    await expect(service.revokeAdminCode(pending.record.id)).resolves.toBe(true);

    const used = makeUsedRecord("another-token");
    repository.records.push(used);
    await expect(service.revokeAdminCode(used.id)).resolves.toBe(false);
  });

  it("filters admin records and runs both cleanup operations", async () => {
    await service.createAdminCode();
    repository.records.push({
      ...makeUsedRecord("list-token"),
      status: "expired" as AccessCodeStatus,
    });
    await expect(
      service.listAdminCodes({ status: "pending", limit: 50 }),
    ).resolves.toHaveLength(1);
    await expect(service.cleanupDemoData()).resolves.toEqual({
      expired: 2,
      redacted: 3,
    });
  });
});
