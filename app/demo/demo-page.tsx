import { cookies } from "next/headers";
import { DemoPortal } from "@/components/demo/DemoPortal";
import { createSupabaseDemoRepository } from "@/lib/demo/repository";
import { createDemoService } from "@/lib/demo/service";
import { DEMO_SESSION_COOKIE } from "@/lib/demo/session";
import type { DemoCredentialType, DemoSessionView } from "@/lib/demo/types";

async function initialSession(): Promise<DemoSessionView> {
  const token = (await cookies()).get(DEMO_SESSION_COOKIE)?.value;
  if (!token) return { state: "none" };
  try {
    return await createDemoService(createSupabaseDemoRepository()).getSessionView(token, new Date());
  } catch {
    return { state: "none" };
  }
}

/** Both addresses render the same portal; only the kind of access differs. */
export async function DemoPage({ kind }: { kind: DemoCredentialType }) {
  return <DemoPortal initialSession={await initialSession()} kind={kind} />;
}
