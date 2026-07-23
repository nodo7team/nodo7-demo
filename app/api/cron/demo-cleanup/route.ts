import { NextRequest, NextResponse } from "next/server";
import { createSupabaseDemoRepository } from "@/lib/demo/repository";
import { createDemoService } from "@/lib/demo/service";

interface CleanupDependencies {
  secret: string | undefined;
  cleanupDemoData(): Promise<{ expired: number; redacted: number }>;
}

export function createCleanupHandler(dependencies: CleanupDependencies) {
  return async function cleanupHandler(request: NextRequest) {
    const authorization = request.headers.get("authorization");
    if (!dependencies.secret || authorization !== `Bearer ${dependencies.secret}`) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    return NextResponse.json(await dependencies.cleanupDemoData());
  };
}

export async function GET(request: NextRequest) {
  const service = createDemoService(createSupabaseDemoRepository());
  return createCleanupHandler({
    secret: process.env.CRON_SECRET,
    cleanupDemoData: service.cleanupDemoData,
  })(request);
}
