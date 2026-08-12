import { NextRequest, NextResponse } from "next/server";
import {
  createFollowupSender,
  type FollowupOutcome,
} from "@/lib/demo/followup";
import { createSupabaseDemoRepository } from "@/lib/demo/repository";

interface FollowupDependencies {
  secret: string | undefined;
  sendDueFollowups(now: Date): Promise<FollowupOutcome>;
}

export function createFollowupHandler(dependencies: FollowupDependencies) {
  return async function followupHandler(request: NextRequest) {
    const authorization = request.headers.get("authorization");
    if (
      !dependencies.secret ||
      authorization !== `Bearer ${dependencies.secret}`
    ) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    return NextResponse.json(await dependencies.sendDueFollowups(new Date()));
  };
}

export async function GET(request: NextRequest) {
  const sender = createFollowupSender(createSupabaseDemoRepository());
  return createFollowupHandler({
    secret: process.env.CRON_SECRET,
    sendDueFollowups: sender.sendDueFollowups,
  })(request);
}
