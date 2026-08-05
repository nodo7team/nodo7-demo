import type {
  AccessCodeRecord,
  AccessCodeWithRequest,
  AdminCodeFilters,
  DemoRepository,
  DemoRequestRecord,
} from "@/lib/demo/repository";
import { packageName } from "@/lib/demo/packages";
import { createDemoSessionToken } from "@/lib/demo/session";
import {
  decryptCredential,
  generateAccessCode,
  hashSecret,
} from "@/lib/demo/secrets";
import type {
  DemoCredentialType,
  DemoDeliveryView,
  DemoResultView,
  DemoSessionView,
} from "@/lib/demo/types";
import { maskPhone } from "@/lib/whatsapp/phone";

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
  createAdminCode(credentialType: DemoCredentialType): Promise<{
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

/**
 * The encrypted column holds whichever secret the demo produced, so the access
 * code's own type decides how to read it back.
 */
function resultView(
  credentialType: DemoCredentialType,
  request: DemoRequestRecord,
): DemoResultView | null {
  const delivery: DemoDeliveryView = {
    status: request.deliveryStatus,
    maskedPhone: maskPhone(request.phone),
  };

  // Once WhatsApp is the only channel the secret never reaches the browser,
  // delivered or not: reloading the page must not become a way around it.
  if (
    request.deliveryStatus !== "disabled" &&
    process.env.WHATSAPP_HIDE_CREDENTIALS === "true"
  ) {
    return {
      kind: "delivered",
      packageId: request.packageId,
      packageName: packageName(request.packageId),
      expiresAt: request.providerExpiresAt,
      delivery,
    };
  }

  if (!request.password) return null;
  const secret = decryptCredential(request.password);

  if (credentialType === "activecode") {
    return {
      kind: "activecode",
      code: secret,
      packageId: request.packageId,
      packageName: packageName(request.packageId),
      expiresAt: null,
      delivery,
    };
  }

  if (!request.username) return null;
  return {
    kind: "line",
    username: request.username,
    password: secret,
    packageId: request.packageId,
    packageName: packageName(request.packageId),
    expiresAt: request.providerExpiresAt,
    delivery,
  };
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
    async createAdminCode(credentialType) {
      const code = generateAccessCode();
      const record = await repository.createCode({
        codeHash: hashSecret(code),
        displaySuffix: code.slice(-4),
        credentialType,
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
          deliveryOnly: process.env.WHATSAPP_HIDE_CREDENTIALS === "true",
        };
      }

      const request = record.request;
      if (record.status === "used" && request?.status === "ok") {
        const result = resultView(record.credentialType, request);
        if (result) {
          return {
            state: "result",
            deadline: record.sessionDeadline,
            remainingSeconds: seconds,
            result,
          };
        }
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
