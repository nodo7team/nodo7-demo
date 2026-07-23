import { NextRequest, NextResponse } from "next/server";
import { createSupabaseDemoRepository } from "@/lib/demo/repository";
import {
  createDemoService,
  type DemoAccessService,
} from "@/lib/demo/service";
import { DEMO_SESSION_COOKIE } from "@/lib/demo/session";

type SessionService = Pick<DemoAccessService, "getSessionView">;

export function createSessionHandler(service: SessionService) {
  return async function sessionHandler(request: NextRequest) {
    const token = request.cookies.get(DEMO_SESSION_COOKIE)?.value ?? null;
    const view = await service.getSessionView(token, new Date());
    return NextResponse.json(view);
  };
}

export async function GET(request: NextRequest) {
  const service = createDemoService(createSupabaseDemoRepository());
  return createSessionHandler(service)(request);
}
