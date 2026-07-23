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
          id: 42,
          username: "real-user",
          password: "real-pass",
          exp_date: 1784731200,
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
      name: "María",
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
    expect(url).toContain("action=create_line");
    expect(url).toContain("api_key=private-key");
    const form = new URLSearchParams(String(init.body));
    expect(form.get("package")).toBe("7");
    expect(form.get("trial")).toBe("1");
    expect(form.get("username")).toMatch(/^n7/);
    expect(form.get("password")).toBeTruthy();
    expect(form.has("paid")).toBe(false);
  });

  it("classifies provider rejections separately from unknown outcomes", async () => {
    const rejected = createClickTvDemoProvider({
      baseUrl: "https://provider.example/api",
      apiKey: "private-key",
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ result: false, error: "no credits" }), {
          status: 200,
        }),
      ),
    });
    await expect(
      rejected.createDemo({
        name: "María",
        packageId: 7,
        idempotencyKey: "00000000-0000-4000-8000-000000000001",
      }),
    ).rejects.toMatchObject({ outcome: "explicit" });

    const timedOut = createClickTvDemoProvider({
      baseUrl: "https://provider.example/api",
      apiKey: "private-key",
      fetchImpl: vi.fn().mockRejectedValue(new Error("timeout")),
    });
    await expect(
      timedOut.createDemo({
        name: "María",
        packageId: 7,
        idempotencyKey: "00000000-0000-4000-8000-000000000001",
      }),
    ).rejects.toMatchObject({ outcome: "ambiguous" });
  });
});
