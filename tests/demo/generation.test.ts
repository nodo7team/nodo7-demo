// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDemoGenerator,
  DemoGenerationError,
  type DemoGenerationRepository,
} from "@/lib/demo/generation";
import {
  DemoProviderError,
  getDemoProvider,
  type DemoProvider,
} from "@/lib/demo/provider";
import type {
  AccessCodeWithRequest,
  DemoRequestRecord,
} from "@/lib/demo/repository";
import { decryptCredential, hashSecret } from "@/lib/demo/secrets";

const NOW = new Date("2026-07-22T12:00:00.000Z");
const TOKEN = "opaque-session-token";

class GenerationRepositoryDouble implements DemoGenerationRepository {
  attemptCount = 0;
  request: DemoRequestRecord | null = null;
  completedPassword: DemoRequestRecord["password"] = null;
  failCompletion = false;
  now = NOW;
  access: AccessCodeWithRequest;

  constructor() {
    this.access = {
      id: "access-1",
      codeHash: hashSecret("N7-TEST-CODE"),
      displaySuffix: "CODE",
      status: "active",
      sessionHash: hashSecret(TOKEN),
      generationAttemptCount: 0,
      activationIp: "203.0.113.10",
      activatedAt: NOW.toISOString(),
      sessionDeadline: "2026-07-22T12:10:00.000Z",
      usedAt: null,
      revokedAt: null,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      request: null,
    };
  }

  async claimGenerationAttempt(sessionHash: string): Promise<number | null> {
    if (
      sessionHash !== this.access.sessionHash ||
      this.access.status !== "active" ||
      new Date(this.access.sessionDeadline!).getTime() <= this.now.getTime() ||
      this.attemptCount >= 3
    ) {
      return null;
    }
    this.attemptCount += 1;
    this.access.generationAttemptCount = this.attemptCount;
    return this.attemptCount;
  }

  async findBySessionHash(
    sessionHash: string,
  ): Promise<AccessCodeWithRequest | null> {
    if (sessionHash !== this.access.sessionHash) return null;
    return { ...this.access, request: this.request };
  }

  async getOrCreateRequest(input: {
    accessCodeId: string;
    name: string;
    packageId: 6 | 7;
  }): Promise<{ record: DemoRequestRecord; created: boolean }> {
    if (this.request) return { record: this.request, created: false };
    this.request = {
      id: "request-1",
      accessCodeId: input.accessCodeId,
      name: input.name,
      packageId: input.packageId,
      providerIdempotencyKey: "00000000-0000-4000-8000-000000000001",
      status: "creating",
      attemptCount: 1,
      username: null,
      password: null,
      providerExpiresAt: null,
      errorCode: null,
      createdAt: NOW.toISOString(),
      completedAt: null,
      updatedAt: NOW.toISOString(),
    };
    return { record: this.request, created: true };
  }

  async prepareRequestRetry(
    requestId: string,
  ): Promise<DemoRequestRecord | null> {
    if (
      !this.request ||
      this.request.id !== requestId ||
      this.request.status !== "error" ||
      this.request.attemptCount >= 3
    ) {
      return null;
    }
    this.request.status = "creating";
    this.request.attemptCount += 1;
    return this.request;
  }

  async completeGeneration(input: {
    sessionHash: string;
    requestId: string;
    externalId: string;
    username: string;
    password: NonNullable<DemoRequestRecord["password"]>;
    expiresAt: string | null;
  }): Promise<boolean> {
    if (this.failCompletion) throw new Error("database unavailable");
    if (!this.request || this.request.id !== input.requestId) return false;
    this.completedPassword = input.password;
    this.request.status = "ok";
    this.request.username = input.username;
    this.request.password = input.password;
    this.request.providerExpiresAt = input.expiresAt;
    this.access.status = "used";
    this.access.usedAt = this.now.toISOString();
    return true;
  }

  async markRequestFailure(input: {
    requestId: string;
    status: "error" | "ambiguous";
    errorCode: string;
  }): Promise<void> {
    if (!this.request || this.request.id !== input.requestId) return;
    this.request.status = input.status;
    this.request.errorCode = input.errorCode;
  }
}

function successfulProvider(): DemoProvider {
  return {
    createDemo: vi.fn().mockResolvedValue({
      externalId: "provider-1",
      username: "nodo7-demo",
      password: "provider-secret",
      expiresAt: "2026-07-22T13:00:00.000Z",
      packageName: "1 hora FULL",
    }),
  };
}

describe("demo generation", () => {
  let repository: GenerationRepositoryDouble;

  beforeEach(() => {
    process.env.DEMO_HASH_SECRET = "h".repeat(64);
    process.env.DEMO_CREDENTIALS_KEY = Buffer.alloc(32, 7).toString("base64");
    delete process.env.DEMO_PROVIDER;
    repository = new GenerationRepositoryDouble();
  });

  it("creates one demo and stores its password encrypted", async () => {
    const provider = successfulProvider();
    const generator = createDemoGenerator(repository, provider);
    await expect(
      generator.generateDemoForSession({
        token: TOKEN,
        body: { name: "María", packageId: 7 },
        now: NOW,
      }),
    ).resolves.toMatchObject({
      username: "nodo7-demo",
      password: "provider-secret",
      packageId: 7,
      packageName: "1 hora FULL",
    });
    expect(provider.createDemo).toHaveBeenCalledTimes(1);
    expect(repository.completedPassword?.ciphertext).not.toContain(
      "provider-secret",
    );
    expect(decryptCredential(repository.completedPassword!)).toBe(
      "provider-secret",
    );
    expect(repository.access.status).toBe("used");
  });

  it("reuses the same idempotency key after an explicit provider failure", async () => {
    const createDemo = vi
      .fn()
      .mockRejectedValueOnce(
        new DemoProviderError("PROVIDER_REJECTED", "explicit"),
      )
      .mockResolvedValueOnce({
        externalId: "provider-1",
        username: "nodo7-demo",
        password: "provider-secret",
        expiresAt: null,
        packageName: "4 horas",
      });
    const generator = createDemoGenerator(repository, { createDemo });
    const input = {
      token: TOKEN,
      body: { name: "Juan", packageId: 6 as const },
      now: NOW,
    };

    await expect(generator.generateDemoForSession(input)).rejects.toMatchObject({
      publicCode: "GENERATION_FAILED",
    });
    await expect(generator.generateDemoForSession(input)).resolves.toMatchObject({
      username: "nodo7-demo",
    });
    expect(createDemo).toHaveBeenCalledTimes(2);
    expect(createDemo.mock.calls[0][0].idempotencyKey).toBe(
      createDemo.mock.calls[1][0].idempotencyKey,
    );
  });

  it("counts malformed submissions before validation and stops after three", async () => {
    const provider = successfulProvider();
    const generator = createDemoGenerator(repository, provider);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await expect(
        generator.generateDemoForSession({
          token: TOKEN,
          body: { name: "x", packageId: 99 },
          now: NOW,
        }),
      ).rejects.toMatchObject({ publicCode: "INVALID_REQUEST" });
    }
    await expect(
      generator.generateDemoForSession({
        token: TOKEN,
        body: { name: "María", packageId: 7 },
        now: NOW,
      }),
    ).rejects.toMatchObject({ publicCode: "SESSION_UNAVAILABLE" });
    expect(provider.createDemo).not.toHaveBeenCalled();
  });

  it("does not call the provider after the deadline", async () => {
    repository.now = new Date("2026-07-22T12:10:00.000Z");
    const provider = successfulProvider();
    const generator = createDemoGenerator(repository, provider);
    await expect(
      generator.generateDemoForSession({
        token: TOKEN,
        body: { name: "María", packageId: 7 },
        now: repository.now,
      }),
    ).rejects.toMatchObject({ publicCode: "SESSION_UNAVAILABLE" });
    expect(provider.createDemo).not.toHaveBeenCalled();
  });

  it("does not call the provider after a successful demo", async () => {
    repository.access.status = "used";
    const provider = successfulProvider();
    const generator = createDemoGenerator(repository, provider);
    await expect(
      generator.generateDemoForSession({
        token: TOKEN,
        body: { name: "María", packageId: 7 },
        now: NOW,
      }),
    ).rejects.toMatchObject({ publicCode: "SESSION_UNAVAILABLE" });
    expect(provider.createDemo).not.toHaveBeenCalled();
  });

  it("marks unknown provider outcomes as ambiguous and never retries them", async () => {
    const createDemo = vi.fn().mockRejectedValue(new Error("network timeout"));
    const generator = createDemoGenerator(repository, { createDemo });
    const input = {
      token: TOKEN,
      body: { name: "María", packageId: 7 as const },
      now: NOW,
    };
    await expect(generator.generateDemoForSession(input)).rejects.toMatchObject({
      publicCode: "OUTCOME_UNKNOWN",
    });
    expect(repository.request?.status).toBe("ambiguous");
    await expect(generator.generateDemoForSession(input)).rejects.toMatchObject({
      publicCode: "OUTCOME_UNKNOWN",
    });
    expect(createDemo).toHaveBeenCalledTimes(1);
  });

  it("marks a successful provider call as ambiguous when persistence fails", async () => {
    repository.failCompletion = true;
    const provider = successfulProvider();
    const generator = createDemoGenerator(repository, provider);
    await expect(
      generator.generateDemoForSession({
        token: TOKEN,
        body: { name: "María", packageId: 7 },
        now: NOW,
      }),
    ).rejects.toMatchObject({ publicCode: "OUTCOME_UNKNOWN" });
    expect(provider.createDemo).toHaveBeenCalledTimes(1);
    expect(repository.request?.status).toBe("ambiguous");
  });

  it("keeps the provider disabled until the client API is configured", async () => {
    await expect(
      getDemoProvider().createDemo({
        name: "María",
        packageId: 7,
        idempotencyKey: "00000000-0000-4000-8000-000000000001",
      }),
    ).rejects.toMatchObject({ code: "PROVIDER_NOT_CONFIGURED" });
  });
});
