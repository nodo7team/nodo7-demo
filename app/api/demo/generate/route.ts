import { NextRequest, NextResponse } from "next/server";
import {
  createDemoGenerator,
  DemoGenerationError,
  type DemoGenerator,
} from "@/lib/demo/generation";
import { getDemoProvider } from "@/lib/demo/provider";
import { createSupabaseDemoRepository } from "@/lib/demo/repository";
import { DEMO_SESSION_COOKIE } from "@/lib/demo/session";

type GeneratorService = Pick<DemoGenerator, "generateDemoForSession">;

function publicMessage(error: DemoGenerationError): string {
  switch (error.publicCode) {
    case "INVALID_REQUEST":
      return "Revisa el nombre y el paquete seleccionado.";
    case "SESSION_UNAVAILABLE":
      return "La sesión ya no está disponible.";
    case "GENERATION_IN_PROGRESS":
      return "La demo ya se está generando.";
    case "OUTCOME_UNKNOWN":
      return "No pudimos confirmar el resultado. Contacta al administrador.";
    default:
      return "No se pudo generar la demo. Intenta nuevamente.";
  }
}

export function createGenerateHandler(generator: GeneratorService) {
  return async function generateHandler(request: NextRequest) {
    const token = request.cookies.get(DEMO_SESSION_COOKIE)?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    try {
      const result = await generator.generateDemoForSession({
        token,
        body,
        now: new Date(),
      });
      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof DemoGenerationError) {
        return NextResponse.json(
          { error: publicMessage(error) },
          { status: error.status },
        );
      }
      return NextResponse.json(
        { error: "No se pudo generar la demo." },
        { status: 500 },
      );
    }
  };
}

export async function POST(request: NextRequest) {
  const generator = createDemoGenerator(
    createSupabaseDemoRepository(),
    getDemoProvider(),
  );
  return createGenerateHandler(generator)(request);
}
