import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createSupabaseDemoRepository } from "@/lib/demo/repository";
import { createDemoService } from "@/lib/demo/service";

interface RevokeDependencies {
  authenticate(): Promise<boolean>;
  revokeAdminCode(id: string): Promise<boolean>;
}

export function createRevokeHandler(dependencies: RevokeDependencies) {
  return async function revokeHandler(_request: NextRequest, id: string) {
    if (!(await dependencies.authenticate())) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    const revoked = await dependencies.revokeAdminCode(id);
    if (!revoked) {
      return NextResponse.json(
        { error: "El código ya no puede revocarse." },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true });
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const service = createDemoService(createSupabaseDemoRepository());
  return createRevokeHandler({
    authenticate: getSession,
    revokeAdminCode: service.revokeAdminCode,
  })(request, (await context.params).id);
}
