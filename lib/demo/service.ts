import type {
  AccessCodeRecord,
  AccessCodeWithRequest,
  AdminCodeFilters,
  DemoRepository,
} from "@/lib/demo/repository";
import { createDemoSessionToken } from "@/lib/demo/session";
import {
  decryptCredential,
  generateAccessCode,
  hashSecret,
} from "@/lib/demo/secrets";
import type { DemoSessionView } from "@/lib/demo/types";

const ACTIVATION_WINDOW_MS = 15 * 60 * 1_000;
const MAX_FAILED_ACTIVATIONS = 10;

export type DemoAccessPublicCode = "CODE_UNAVAILABLE" | "RATE_LIMITED";

export class DemoAccessError extends Error {
  constructor(
    public readonly publicCode: DemoAccessPublicCode,
    public readonly status: number,
  ) {
    super(publicCode);
    this.name = "DemoAccessError";
  }
}

export interface DemoAccessService {
  createAdminCode(): Promise<{
    code: string;
    record: AccessCodeRecord;
  }>;
  activateAccessCode(input: {
    code: string;
    ip: string;
    now: Date;
  }): Promise<{ token: string; deadline: string }>;
  getSessionView(token: string | null, now: Date): Promise<DemoSessionView>;
  listAdminCodes(filters: AdminCodeFilters): Promise<AccessCodeWithRequest[]>;
  revokeAdminCode(id: string): Promise<boolean>;
  cleanupDemoData(): Promise<{ expired: number; redacted: number }>;
}

function normalizeAccessCode(code: string): string {
  return code.replace(/\s+/g, "").toUpperCase();
}

function remainingSeconds(deadline: string, now: Date): number {
  return Math.max(
    0,
    Math.ceil((new Date(deadline).getTime() - now.getTime()) / 1_000),
  );
}

function packageName(packageId: 6 | 7): string {
  return packageId === 7 ? "1 hora FULL" : "4 horas";
}

async function ignoreAuditFailure(operation: Promise<void>): Promise<void> {
  try {
    await operation;
  } catch {
    // A consumed one-use code must still deliver its session cookie.
  }
}

export function createDemoService(
  repository: DemoRepository,
): DemoAccessService {
  return {
    async createAdminCode() {
      const code = generateAccessCode();
      const record = await repository.createCode({
        codeHash: hashSecret(code),
        displaySuffix: code.slice(-4),
      });
      return { code, record };
    },

    async activateAccessCode({ code, ip, now }) {
      const since = new Date(now.getTime() - ACTIVATION_WINDOW_MS).toISOString();
      const failures = await repository.countFailedActivations(ip, since);
      if (failures >= MAX_FAILED_ACTIVATIONS) {
        throw new DemoAccessError("RATE_LIMITED", 429);
      }

      const normalizedCode = normalizeAccessCode(code);
      const codeHash = hashSecret(normalizedCode);
      const codeFingerprint = codeHash.slice(0, 16);
      const session = createDemoSessionToken();
      const record = await repository.activateCode({
        codeHash,
        sessionHash: session.tokenHash,
        ip,
      });

      if (!record?.sessionDeadline) {
        await ignoreAuditFailure(
          repository.recordActivationAttempt({
            codeFingerprint,
            ip,
            success: false,
            errorCode: "CODE_UNAVAILABLE",
            createdAt: now.toISOString(),
          }),
        );
        throw new DemoAccessError("CODE_UNAVAILABLE", 404);
      }

      await ignoreAuditFailure(
        repository.recordActivationAttempt({
          codeFingerprint,
          ip,
          success: true,
          errorCode: null,
          createdAt: now.toISOString(),
        }),
      );
      return { token: session.token, deadline: record.sessionDeadline };
    },

    async getSessionView(token, now) {
      if (!token) return { state: "none" };
      const record = await repository.findBySessionHash(hashSecret(token));
      if (!record) return { state: "none" };
      if (!record.sessionDeadline) return { state: "expired" };

      const seconds = remainingSeconds(record.sessionDeadline, now);
      if (seconds === 0 || ["expired", "revoked"].includes(record.status)) {
        return { state: "expired" };
      }

      if (record.status === "active") {
        return {
          state: "setup",
          deadline: record.sessionDeadline,
          remainingSeconds: seconds,
        };
      }

      const request = record.request;
      if (
        record.status === "used" &&
        request?.status === "ok" &&
        request.username &&
        request.password
      ) {
        return {
          state: "result",
          deadline: record.sessionDeadline,
          remainingSeconds: seconds,
          result: {
            username: request.username,
            password: decryptCredential(request.password),
            packageId: request.packageId,
            packageName: packageName(request.packageId),
            expiresAt: request.providerExpiresAt,
          },
        };
      }

      return { state: "expired" };
    },

    listAdminCodes(filters) {
      return repository.listCodes(filters);
    },

    revokeAdminCode(id) {
      return repository.revokeCode(id);
    },

    async cleanupDemoData() {
      const [expired, redacted] = await Promise.all([
        repository.expireSessions(),
        repository.redactAudit(),
      ]);
      return { expired, redacted };
    },
  };
}
