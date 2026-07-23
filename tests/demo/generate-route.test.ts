// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createGenerateHandler } from "@/app/api/demo/generate/route";
import { DEMO_SESSION_COOKIE } from "@/lib/demo/session";

describe("demo generation route", () => {
  it("passes the opaque cookie and raw body to the generator", async () => {
    const generateDemoForSession = vi.fn().mockResolvedValue({
      username: "demo-user",
      password: "demo-pass",
      packageId: 7,
      packageName: "1 hora FULL",
      expiresAt: null,
    });
    const handler = createGenerateHandler({ generateDemoForSession });
    const response = await handler(
      new NextRequest("https://nodo7.example/api/demo/generate?token=evil", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${DEMO_SESSION_COOKIE}=cookie-token`,
        },
        body: JSON.stringify({ name: "María", packageId: 7 }),
      }),
    );
    expect(response.status).toBe(200);
    expect(generateDemoForSession).toHaveBeenCalledWith({
      token: "cookie-token",
      body: { name: "María", packageId: 7 },
      now: expect.any(Date),
    });
    expect(generateDemoForSession).not.toHaveBeenCalledWith(
      expect.objectContaining({ token: "evil" }),
    );
  });

  it("rejects requests without the session cookie", async () => {
    const generateDemoForSession = vi.fn();
    const handler = createGenerateHandler({ generateDemoForSession });
    const response = await handler(
      new NextRequest("https://nodo7.example/api/demo/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "María", packageId: 7 }),
      }),
    );
    expect(response.status).toBe(401);
    expect(generateDemoForSession).not.toHaveBeenCalled();
  });
});
