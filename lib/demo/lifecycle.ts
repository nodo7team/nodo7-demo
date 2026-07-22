import type { AccessCodeStatus } from "@/lib/demo/types";

export const DEMO_SESSION_DURATION_MS = 10 * 60 * 1_000;

interface ClassifiableAccess {
  status: AccessCodeStatus;
  sessionDeadline: string | null;
}

export function startDeadline(now: Date): Date {
  return new Date(now.getTime() + DEMO_SESSION_DURATION_MS);
}

export function classifyAccess(
  access: ClassifiableAccess,
  now: Date,
): AccessCodeStatus {
  if (access.status !== "active") {
    return access.status;
  }

  if (
    access.sessionDeadline === null ||
    new Date(access.sessionDeadline).getTime() <= now.getTime()
  ) {
    return "expired";
  }

  return "active";
}
