// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  createAccessHandler,
  getTrustedProxyIp,
} from "@/app/api/demo/access/route";
import { createSessionHandler } from "@/app/api/demo/session/route";
import { DemoAccessError } from "@/lib/demo/service";
import { DEMO_SESSION_COOKIE } from "@/lib/demo/session";

describe("public demo routes", () => {
  it("activates a valid code and sets the protected session cookie", async () => {
    const activateAccessCode = vi.fn().mockResolvedValue({
      token: "opaque-session-token",
      deadline: "2026-07-22T12:10:00.000Z",
    });
    const handler = createAccessHandler({ activateAccessCode });
    const response = await handler(
      new NextRequest("https://nodo7.example/api/demo/access", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-vercel-forwarded-for": "203.0.113.8, 10.0.0.1",
        },
        body: JSON.stringify({ code: "N7-VALID-CODE" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      state: "setup",
      deadline: "2026-07-22T12:10:00.000Z",
      remainingSeconds: 600,
    });
    expect(activateAccessCode).toHaveBeenCalledWith(
      expect.objectContaining({ code: "N7-VALID-CODE", ip: "203.0.113.8" }),
    );
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${DEMO_SESSION_COOKIE}=opaque-session-token`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=strict/i);
    expect(cookie).toMatch(/Path=\//i);
    expect(cookie).toMatch(/Max-Age=600/i);
  });

  it("returns one generic message for unavailable codes", async () => {
    const handler = createAccessHandler({
      activateAccessCode: vi
        .fn()
        .mockRejectedValue(new DemoAccessError("CODE_UNAVAILABLE", 404)),
    });
    const response = await handler(
      new NextRequest("https://nodo7.example/api/demo/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "bad-code" }),
      }),
    );
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Código inválido o no disponible.",
    });
  });

  it("rejects malformed payloads before calling the service", async () => {
    const activateAccessCode = vi.fn();
    const handler = createAccessHandler({ activateAccessCode });
    const response = await handler(
      new NextRequest("https://nodo7.example/api/demo/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "tiny" }),
      }),
    );
    expect(response.status).toBe(400);
    expect(activateAccessCode).not.toHaveBeenCalled();
  });

  it("reads the session only from its cookie", async () => {
    const getSessionView = vi.fn().mockResolvedValue({
      state: "setup",
      deadline: "2026-07-22T12:10:00.000Z",
      remainingSeconds: 500,
    });
    const handler = createSessionHandler({ getSessionView });
    const response = await handler(
      new NextRequest(
        "https://nodo7.example/api/demo/session?token=attacker-token",
        {
          headers: {
            cookie: `${DEMO_SESSION_COOKIE}=cookie-token`,
          },
        },
      ),
    );
    expect(response.status).toBe(200);
    expect(getSessionView).toHaveBeenCalledWith("cookie-token", expect.any(Date));
    expect(getSessionView).not.toHaveBeenCalledWith(
      "attacker-token",
      expect.any(Date),
    );
  });

  it("prefers Vercel's trusted forwarding header", () => {
    const request = new NextRequest("https://nodo7.example/api/demo/access", {
      headers: {
        "x-vercel-forwarded-for": "198.51.100.10, 10.0.0.2",
        "x-forwarded-for": "203.0.113.99",
      },
    });
    expect(getTrustedProxyIp(request)).toBe("198.51.100.10");
  });
});
