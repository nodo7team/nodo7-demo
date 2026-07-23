import { cookies } from "next/headers";
import { DemoPortal } from "@/components/demo/DemoPortal";
import { createSupabaseDemoRepository } from "@/lib/demo/repository";
import { createDemoService } from "@/lib/demo/service";
import { DEMO_SESSION_COOKIE } from "@/lib/demo/session";
import type { DemoSessionView } from "@/lib/demo/types";

export const dynamic = "force-dynamic";

async function initialSession(): Promise<DemoSessionView> {
  const token = (await cookies()).get(DEMO_SESSION_COOKIE)?.value;
  if (!token) return { state: "none" };
  try {
    return await createDemoService(createSupabaseDemoRepository()).getSessionView(token, new Date());
  } catch {
    return { state: "none" };
  }
}

export default async function DemoPage() {
  return <DemoPortal initialSession={await initialSession()} />;
}
