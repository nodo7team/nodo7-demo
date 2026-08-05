// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClickTvDemoProvider } from "@/lib/demo/providers/clicktv";
import type { DemoCredentialType } from "@/lib/demo/types";

const KEY = "00000000-0000-4000-8000-000000000001";
const OTHER_KEY = "00000000-0000-4000-8000-000000000002";

function providerWith(body: unknown, fetchImpl = vi.fn()) {
  fetchImpl.mockResolvedValue(
    new Response(JSON.stringify(body), { status: 200 }),
  );
  return {
    fetchImpl,
    provider: createClickTvDemoProvider({
      baseUrl: "https://provider.example/api",
      apiKey: "private-key",
      fetchImpl,
    }),
  };
}

function submittedForm(fetchImpl: ReturnType<typeof vi.fn>): URLSearchParams {
  const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
  return new URLSearchParams(String(init.body));
}

describe("ClickTV demo compatibility provider", () => {
  beforeEach(() => {
    process.env.DEMO_HASH_SECRET = "h".repeat(64);
  });

  it("submits the create_line operation for a credentials demo", async () => {
    const { provider, fetchImpl } = providerWith({
      status: "STATUS_SUCCESS",
      data: {
        id: 42,
        username: "real-user",
        password: "real-pass",
        exp_date: 1784731200,
      },
    });

    const result = await provider.createDemo({
      name: "María José",
      packageId: 7,
      credentialType: "line",
      idempotencyKey: KEY,
    });

    expect(result).toMatchObject({
      kind: "line",
      externalId: "42",
      username: "real-user",
      password: "real-pass",
      packageName: "1 hora FULL",
    });

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://provider.example/api");
    expect(init.method).toBe("POST");

    const form = submittedForm(fetchImpl);
    expect(form.get("api_key")).toBe("private-key");
    expect(form.get("action")).toBe("create_line");
    expect(form.get("package")).toBe("7");
    expect(form.get("trial")).toBe("1");
    expect(form.get("is_isplock")).toBe("0");
    expect(form.get("reseller_notes")).toBe("María José");
    expect(form.get("username")).toMatch(/^mariatv\d{3}$/);
    expect(form.get("password")).toMatch(/^[A-Za-z2-9]{8}$/);
    expect(form.has("code")).toBe(false);
    expect(form.has("paid")).toBe(false);
  });

  it("submits the create_activecode operation for an activation demo", async () => {
    const { provider, fetchImpl } = providerWith({
      status: "STATUS_SUCCESS",
      data: { id: 892, code: "N7ABCD2345", package_id: 7, is_trial: 1 },
    });

    const result = await provider.createDemo({
      name: "María José",
      packageId: 7,
      credentialType: "activecode",
      idempotencyKey: KEY,
    });

    expect(result).toMatchObject({
      kind: "activecode",
      externalId: "892",
      code: "N7ABCD2345",
      expiresAt: null,
      packageName: "1 hora FULL",
    });

    const form = submittedForm(fetchImpl);
    expect(form.get("action")).toBe("create_activecode");
    expect(form.get("package")).toBe("7");
    expect(form.get("trial")).toBe("1");
    expect(form.get("reseller_notes")).toBe("María José");
    expect(form.has("username")).toBe(false);
    expect(form.has("password")).toBe(false);
    // Digits only: the visitor types this on a TV remote.
    expect(form.get("code")).toMatch(/^\d{10}$/);
  });

  it("keeps the submitted code, which the panel does not echo back", async () => {
    // Verified in production: create_activecode answers without data.code, so
    // the code we sent is the only one that exists.
    const { provider, fetchImpl } = providerWith({
      status: "STATUS_SUCCESS",
      data: { id: 892 },
    });

    const result = await provider.createDemo({
      name: "Pedro",
      packageId: 6,
      credentialType: "activecode",
      idempotencyKey: KEY,
    });

    expect(result).toMatchObject({
      kind: "activecode",
      externalId: "892",
      code: submittedForm(fetchImpl).get("code"),
      packageName: "4 horas",
    });
  });

  it("derives a stable numeric code from the idempotency key", async () => {
    const first = await submittedValue("code", "activecode", "María José", KEY);
    const same = await submittedValue("code", "activecode", "María José", KEY);
    const otherKey = await submittedValue(
      "code",
      "activecode",
      "María José",
      OTHER_KEY,
    );

    expect(first).toMatch(/^\d{10}$/);
    expect(same).toBe(first);
    expect(otherKey).not.toBe(first);
  });

  async function submittedValue(
    field: string,
    credentialType: DemoCredentialType,
    name: string,
    idempotencyKey: string,
  ): Promise<string | null> {
    const { provider, fetchImpl } = providerWith({
      status: "STATUS_SUCCESS",
      data: { id: 42, exp_date: 1784731200 },
    });
    await provider.createDemo({
      name,
      packageId: 7,
      credentialType,
      idempotencyKey,
    });
    return submittedForm(fetchImpl).get(field);
  }

  it("uses the first normalized name with stable readable credentials", async () => {
    const first = await submittedValue("username", "line", "María José", KEY);
    const same = await submittedValue("username", "line", "María José", KEY);
    const different = await submittedValue(
      "username",
      "line",
      "María José",
      OTHER_KEY,
    );

    expect(first).toMatch(/^mariatv\d{3}$/);
    expect(same).toBe(first);
    expect(different).not.toBe(first);
  });

  it.each([
    ["STATUS_FAILURE", "explicit"],
    ["STATUS_INVALID_PACKAGE", "explicit"],
    ["STATUS_NO_TRIALS", "explicit"],
    ["STATUS_EXISTS_USERNAME", "ambiguous"],
  ] as const)("classifies a line %s as %s", async (status, outcome) => {
    const { provider } = providerWith({ status, data: {} });

    await expect(
      provider.createDemo({
        name: "Pedro Gómez",
        packageId: 7,
        credentialType: "line",
        idempotencyKey: KEY,
      }),
    ).rejects.toMatchObject({ outcome });
  });

  it.each([
    ["STATUS_INVALID_PACKAGE", "explicit"],
    ["STATUS_NO_TRIALS", "explicit"],
    ["STATUS_INSUFFICIENT_CREDITS", "explicit"],
    ["STATUS_FAILURE", "ambiguous"],
  ] as const)("classifies an activecode %s as %s", async (status, outcome) => {
    const { provider } = providerWith({ status, data: {} });

    await expect(
      provider.createDemo({
        name: "Pedro Gómez",
        packageId: 7,
        credentialType: "activecode",
        idempotencyKey: KEY,
      }),
    ).rejects.toMatchObject({ outcome });
  });

  it("classifies network failures as unknown outcomes", async () => {
    const timedOut = createClickTvDemoProvider({
      baseUrl: "https://provider.example/api",
      apiKey: "private-key",
      fetchImpl: vi.fn().mockRejectedValue(new Error("timeout")),
    });
    await expect(
      timedOut.createDemo({
        name: "María José",
        packageId: 7,
        credentialType: "line",
        idempotencyKey: KEY,
      }),
    ).rejects.toMatchObject({ outcome: "ambiguous" });
  });
});
