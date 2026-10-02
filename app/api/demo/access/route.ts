import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseDemoRepository } from "@/lib/demo/repository";
import {
  createDemoService,
  DemoAccessError,
  type DemoAccessService,
} from "@/lib/demo/service";
import { DEMO_PAGE_CREDENTIAL_TYPES, DEMO_PAGE_PATH } from "@/lib/demo/pages";
import { demoSessionCookie } from "@/lib/demo/session";

const AccessSchema = z.object({
  code: z.string().min(8).max(64),
  page: z.enum(DEMO_PAGE_CREDENTIAL_TYPES).optional(),
});

type ActivationService = Pick<DemoAccessService, "activateAccessCode">;

export function getTrustedProxyIp(request: NextRequest): string {
  for (const header of [
    "x-vercel-forwarded-for",
    "x-forwarded-for",
    "x-real-ip",
  ]) {
    const value = request.headers.get(header)?.split(",")[0]?.trim();
    if (value) return value;
  }
  return "unknown";
}

export function createAccessHandler(service: ActivationService) {
  return async function accessHandler(request: NextRequest) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Solicitud inválida." },
        { status: 400 },
      );
    }

    const parsed = AccessSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Código de acceso inválido." },
        { status: 400 },
      );
    }

    try {
      const activated = await service.activateAccessCode({
        code: parsed.data.code,
        ip: getTrustedProxyIp(request),
        now: new Date(),
        page: parsed.data.page,
      });
      const cookie = demoSessionCookie(activated.token);
      const response = NextResponse.json({
        state: "setup",
        deadline: activated.deadline,
        remainingSeconds: 600,
      });
      response.cookies.set(cookie.name, cookie.value, cookie.options);
      return response;
    } catch (error) {
      if (error instanceof DemoAccessError) {
        if (error.publicCode === "WRONG_PAGE" && error.correctPage) {
          return NextResponse.json(
            {
              error: "Este pase es para otra página. Te llevamos a la correcta.",
              redirectTo: DEMO_PAGE_PATH[error.correctPage],
            },
            { status: error.status },
          );
        }
        const message =
          error.publicCode === "RATE_LIMITED"
            ? "Demasiados intentos. Intenta nuevamente más tarde."
            : "Código inválido o no disponible.";
        return NextResponse.json({ error: message }, { status: error.status });
      }
      return NextResponse.json(
        { error: "No se pudo iniciar la sesión." },
        { status: 500 },
      );
    }
  };
}

export async function POST(request: NextRequest) {
  const service = createDemoService(createSupabaseDemoRepository());
  return createAccessHandler(service)(request);
}
