import { beforeEach, describe, expect, it } from "vitest";
import {
  createDemoSessionToken,
  DEMO_SESSION_COOKIE,
  demoSessionCookie,
} from "@/lib/demo/session";

beforeEach(() => {
  process.env.DEMO_HASH_SECRET = "h".repeat(64);
});

describe("demo session", () => {
  it("creates an opaque token and stores only its keyed hash", () => {
    const session = createDemoSessionToken();
    expect(session.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(session.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(session.tokenHash).not.toContain(session.token);
  });

  it("uses a strict root-scoped ten-minute cookie", () => {
    expect(DEMO_SESSION_COOKIE).toBe("nodo7_demo_session");
    expect(demoSessionCookie("opaque-token")).toMatchObject({
      name: "nodo7_demo_session",
      value: "opaque-token",
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        maxAge: 600,
      },
    });
  });
});
