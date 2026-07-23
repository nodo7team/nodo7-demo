import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { toAdminCodeView } from "@/lib/demo/admin-client";
import { createSupabaseDemoRepository } from "@/lib/demo/repository";
import {
  createDemoService,
  type DemoAccessService,
} from "@/lib/demo/service";
import type { AccessCodeStatus } from "@/lib/demo/types";

const VALID_STATUSES = new Set<AccessCodeStatus>([
  "pending",
  "active",
  "used",
  "expired",
  "revoked",
]);

interface AdminCodeDependencies {
  authenticate(): Promise<boolean>;
  service: Pick<DemoAccessService, "createAdminCode" | "listAdminCodes">;
}

export function createAdminCodeHandlers(dependencies: AdminCodeDependencies) {
  return {
    async GET(request: NextRequest) {
      if (!(await dependencies.authenticate())) {
        return NextResponse.json({ error: "No autorizado." }, { status: 401 });
      }
      const requestedStatus = request.nextUrl.searchParams.get("status");
      const status =
        requestedStatus && VALID_STATUSES.has(requestedStatus as AccessCodeStatus)
          ? (requestedStatus as AccessCodeStatus)
          : undefined;
      const search = request.nextUrl.searchParams.get("search")?.trim() || undefined;
      const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? 100);
      const limit = Math.min(200, Math.max(1, Number.isFinite(requestedLimit) ? requestedLimit : 100));
      const records = await dependencies.service.listAdminCodes({ status, search, limit });
      return NextResponse.json({ codes: records.map(toAdminCodeView) });
    },

    async POST(_request?: NextRequest) {
      if (!(await dependencies.authenticate())) {
        return NextResponse.json({ error: "No autorizado." }, { status: 401 });
      }
      const created = await dependencies.service.createAdminCode();
      return NextResponse.json(
        { code: created.code, record: toAdminCodeView({ ...created.record, request: null }) },
        { status: 201 },
      );
    },
  };
}

function defaultHandlers() {
  return createAdminCodeHandlers({
    authenticate: getSession,
    service: createDemoService(createSupabaseDemoRepository()),
  });
}

export async function GET(request: NextRequest) {
  return defaultHandlers().GET(request);
}

export async function POST(request: NextRequest) {
  return defaultHandlers().POST(request);
}
