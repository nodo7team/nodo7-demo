import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/edge";

const PUBLIC_EXACT = new Set([
  "/",
  "/demo",
  "/demo/activecode",
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/demo/access",
  "/api/demo/session",
  "/api/demo/generate",
]);

/** Vercel calls these unauthenticated; each one checks CRON_SECRET itself. */
const PUBLIC_CRONS = new Set([
  "/api/cron/demo-cleanup",
  "/api/cron/demo-followup",
]);

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_EXACT.has(pathname) || PUBLIC_CRONS.has(pathname);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:png|jpg|jpeg|svg|gif|webp)$).*)",
  ],
};
