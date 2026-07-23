// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClickTvDemoProvider } from "@/lib/demo/providers/clicktv";

describe("ClickTV demo compatibility provider", () => {
  beforeEach(() => {
    process.env.DEMO_HASH_SECRET = "h".repeat(64);
  });

  it("submits only the inherited create_line demo operation", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "STATUS_SUCCESS",
          data: {
            id: 42,
            username: "real-user",
            password: "real-pass",
            exp_date: 1784731200,
          },
        }),
        { status: 200 },
      ),
    );
    const provider = createClickTvDemoProvider({
      baseUrl: "https://provider.example/api",
      apiKey: "private-key",
      fetchImpl,
    });
    const input = {
      name: "María José",
      packageId: 7 as const,
      idempotencyKey: "00000000-0000-4000-8000-000000000001",
    };
    const result = await provider.createDemo(input);
    expect(result).toMatchObject({
      externalId: "42",
      username: "real-user",
      password: "real-pass",
      packageName: "1 hora FULL",
    });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://provider.example/api");
    expect(init.method).toBe("POST");
    const form = new URLSearchParams(String(init.body));
    expect(form.get("api_key")).toBe("private-key");
    expect(form.get("action")).toBe("create_line");
    expect(form.get("package")).toBe("7");
    expect(form.get("trial")).toBe("1");
    expect(form.get("is_isplock")).toBe("0");
    expect(form.get("username")).toMatch(/^mariatv\d{3}$/);
    expect(form.get("password")).toMatch(/^[A-Za-z2-9]{8}$/);
    expect(form.has("paid")).toBe(false);
  });

  async function submittedCredentials(
    name: string,
    idempotencyKey: string,
  ): Promise<{ username: string | null; password: string | null }> {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "STATUS_SUCCESS",
          data: { id: 42, exp_date: 1784731200 },
        }),
        { status: 200 },
      ),
    );
    const provider = createClickTvDemoProvider({
      baseUrl: "https://provider.example/api",
      apiKey: "private-key",
      fetchImpl,
    });
    await provider.createDemo({ name, packageId: 7, idempotencyKey });
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const form = new URLSearchParams(String(init.body));
    return {
      username: form.get("username"),
      password: form.get("password"),
    };
  }

  it("uses the first normalized name with stable readable credentials", async () => {
    const key = "00000000-0000-4000-8000-000000000001";
    const first = await submittedCredentials("María José", key);
    const same = await submittedCredentials("María José", key);
    const different = await submittedCredentials(
      "María José",
      "00000000-0000-4000-8000-000000000002",
    );

    expect(first.username).toMatch(/^mariatv\d{3}$/);
    expect(first.password).toMatch(/^[A-Za-z2-9]{8}$/);
    expect(same).toEqual(first);
    expect(different).not.toEqual(first);
  });

  it.each([
    ["STATUS_FAILURE", "explicit"],
    ["STATUS_INVALID_PACKAGE", "explicit"],
    ["STATUS_EXISTS_USERNAME", "ambiguous"],
  ] as const)("classifies %s as %s", async (status, outcome) => {
    const provider = createClickTvDemoProvider({
      baseUrl: "https://provider.example/api",
      apiKey: "private-key",
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status, data: {} }), { status: 200 }),
      ),
    });

    await expect(
      provider.createDemo({
        name: "Pedro Gómez",
        packageId: 7,
        idempotencyKey: "00000000-0000-4000-8000-000000000001",
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
        idempotencyKey: "00000000-0000-4000-8000-000000000001",
      }),
    ).rejects.toMatchObject({ outcome: "ambiguous" });
  });
});
