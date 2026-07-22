import { randomBytes } from "node:crypto";
import { hashSecret } from "@/lib/demo/secrets";

export const DEMO_SESSION_COOKIE = "nodo7_demo_session";

export interface DemoCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: "strict";
  path: "/";
  maxAge: 600;
}

export interface DemoSessionCookie {
  name: typeof DEMO_SESSION_COOKIE;
  value: string;
  options: DemoCookieOptions;
}

export function createDemoSessionToken(): {
  token: string;
  tokenHash: string;
} {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashSecret(token) };
}

export function demoSessionCookie(token: string): DemoSessionCookie {
  return {
    name: DEMO_SESSION_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 600,
    },
  };
}
