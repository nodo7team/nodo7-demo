import { z } from "zod";
import type {
  AccessCodeWithRequest,
  DemoRequestRecord,
} from "@/lib/demo/repository";
import {
  DemoProviderError,
  type DemoProvider,
} from "@/lib/demo/provider";
import { encryptCredential, hashSecret } from "@/lib/demo/secrets";
import type {
  DemoDeliveryStatus,
  DemoDeliveryView,
  DemoPackageId,
  DemoResultView,
  EncryptedCredential,
} from "@/lib/demo/types";
import { getWhatsAppClient, type WhatsAppClient } from "@/lib/whatsapp/client";
import { buildCredentialMessage } from "@/lib/whatsapp/message";
import { findCountry, maskPhone, normalizePhone } from "@/lib/whatsapp/phone";

const GenerateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  packageId: z.union([z.literal(6), z.literal(7)]),
  countryIso: z.string().trim().length(2),
  phone: z.string().trim().min(1),
});

export interface DemoGenerationRepository {
  claimGenerationAttempt(sessionHash: string): Promise<number | null>;
  findBySessionHash(
    sessionHash: string,
  ): Promise<AccessCodeWithRequest | null>;
  getOrCreateRequest(input: {
    accessCodeId: string;
    name: string;
    packageId: DemoPackageId;
    phone: string | null;
  }): Promise<{ record: DemoRequestRecord; created: boolean }>;
  recordDelivery(input: {
    requestId: string;
    status: DemoDeliveryStatus;
  }): Promise<void>;
  prepareRequestRetry(requestId: string): Promise<DemoRequestRecord | null>;
  completeGeneration(input: {
    sessionHash: string;
    requestId: string;
    externalId: string;
    username: string | null;
    password: EncryptedCredential;
    expiresAt: string | null;
  }): Promise<boolean>;
  markRequestFailure(input: {
    requestId: string;
    status: "error" | "ambiguous";
    errorCode: string;
  }): Promise<void>;
}

export type DemoGenerationPublicCode =
  | "INVALID_REQUEST"
  | "PHONE_UNREACHABLE"
  | "DELIVERY_UNAVAILABLE"
  | "SESSION_UNAVAILABLE"
  | "GENERATION_IN_PROGRESS"
  | "GENERATION_FAILED"
  | "OUTCOME_UNKNOWN";

export class DemoGenerationError extends Error {
  constructor(
    public readonly publicCode: DemoGenerationPublicCode,
    public readonly status: number,
  ) {
    super(publicCode);
    this.name = "DemoGenerationError";
  }
}

export interface DemoGenerator {
  generateDemoForSession(input: {
    token: string;
    body: unknown;
    now: Date;
  }): Promise<DemoResultView>;
}

function sessionIsActive(
  access: AccessCodeWithRequest | null,
  now: Date,
): access is AccessCodeWithRequest & { sessionDeadline: string } {
  return Boolean(
    access &&
      access.status === "active" &&
      access.sessionDeadline &&
      new Date(access.sessionDeadline).getTime() > now.getTime(),
  );
}

/** When true the credentials never reach the browser, delivered or not. */
function whatsappIsOnlyChannel(): boolean {
  return process.env.WHATSAPP_HIDE_CREDENTIALS === "true";
}

/** Resending is safe; creating a second demo is not. */
async function sendWithOneRetry(
  whatsapp: WhatsAppClient,
  input: { phone: string; message: string },
): Promise<DemoDeliveryStatus> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      if (await whatsapp.sendText(input)) return "sent";
    } catch {
      // Both attempts are allowed to fail without failing the demo.
    }
  }
  return "failed";
}

export function createDemoGenerator(
  repository: DemoGenerationRepository,
  provider: DemoProvider,
  whatsapp: WhatsAppClient = getWhatsAppClient(),
): DemoGenerator {
  return {
    async generateDemoForSession({ token, body, now }) {
      const sessionHash = hashSecret(token);
      const claimed = await repository.claimGenerationAttempt(sessionHash);
      if (claimed === null) {
        throw new DemoGenerationError("SESSION_UNAVAILABLE", 409);
      }

      const parsed = GenerateSchema.safeParse(body);
      if (!parsed.success) {
        throw new DemoGenerationError("INVALID_REQUEST", 400);
      }

      const country = findCountry(parsed.data.countryIso.toUpperCase());
      const phone = country
        ? normalizePhone(country.dial, parsed.data.phone)
        : null;
      if (!phone) {
        throw new DemoGenerationError("INVALID_REQUEST", 400);
      }

      const access = await repository.findBySessionHash(sessionHash);
      if (!sessionIsActive(access, now)) {
        throw new DemoGenerationError("SESSION_UNAVAILABLE", 409);
      }

      if (whatsapp.isConfigured()) {
        // Without a screen to fall back to, a dead session would burn the code
        // and create a demo the visitor could never read.
        if (
          whatsappIsOnlyChannel() &&
          (await whatsapp.connectionState()) !== "connected"
        ) {
          throw new DemoGenerationError("DELIVERY_UNAVAILABLE", 503);
        }

        // Validating before creating anything is what forces a real number: a
        // rejection after the fact would fall back to the screen and let a made
        // up number through.
        if ((await whatsapp.numberExists(phone)) === false) {
          throw new DemoGenerationError("PHONE_UNREACHABLE", 422);
        }
      }

      const selected = await repository.getOrCreateRequest({
        accessCodeId: access.id,
        name: parsed.data.name,
        packageId: parsed.data.packageId,
        phone,
      });
      let request = selected.record;
      if (!selected.created) {
        if (request.status === "ambiguous") {
          throw new DemoGenerationError("OUTCOME_UNKNOWN", 409);
        }
        if (request.status === "ok") {
          throw new DemoGenerationError("SESSION_UNAVAILABLE", 409);
        }
        if (request.status === "creating") {
          throw new DemoGenerationError("GENERATION_IN_PROGRESS", 409);
        }
        const prepared = await repository.prepareRequestRetry(request.id);
        if (!prepared) {
          throw new DemoGenerationError("SESSION_UNAVAILABLE", 409);
        }
        request = prepared;
      }

      let providerResult;
      try {
        providerResult = await provider.createDemo({
          name: request.name,
          packageId: request.packageId,
          credentialType: access.credentialType,
          idempotencyKey: request.providerIdempotencyKey,
        });
      } catch (error) {
        const explicit =
          error instanceof DemoProviderError && error.outcome === "explicit";
        await repository.markRequestFailure({
          requestId: request.id,
          status: explicit ? "error" : "ambiguous",
          errorCode:
            error instanceof DemoProviderError
              ? error.code
              : "PROVIDER_OUTCOME_UNKNOWN",
        });
        throw new DemoGenerationError(
          explicit ? "GENERATION_FAILED" : "OUTCOME_UNKNOWN",
          502,
        );
      }

      const encryptedSecret = encryptCredential(
        providerResult.kind === "line"
          ? providerResult.password
          : providerResult.code,
      );
      let completed = false;
      try {
        completed = await repository.completeGeneration({
          sessionHash,
          requestId: request.id,
          externalId: providerResult.externalId,
          username:
            providerResult.kind === "line" ? providerResult.username : null,
          password: encryptedSecret,
          expiresAt: providerResult.expiresAt,
        });
      } catch {
        try {
          await repository.markRequestFailure({
            requestId: request.id,
            status: "ambiguous",
            errorCode: "RESULT_PERSISTENCE_UNKNOWN",
          });
        } catch {
          // The provider result remains unknown even if audit persistence is down.
        }
        throw new DemoGenerationError("OUTCOME_UNKNOWN", 502);
      }
      if (!completed) {
        try {
          await repository.markRequestFailure({
            requestId: request.id,
            status: "ambiguous",
            errorCode: "RESULT_PERSISTENCE_UNKNOWN",
          });
        } catch {
          // The public response must still prevent an unsafe provider retry.
        }
        throw new DemoGenerationError("OUTCOME_UNKNOWN", 502);
      }

      const credentials: DemoResultView =
        providerResult.kind === "activecode"
          ? {
              kind: "activecode",
              code: providerResult.code,
              packageId: request.packageId,
              packageName: providerResult.packageName,
              expiresAt: null,
              delivery: { status: "pending", maskedPhone: maskPhone(phone) },
            }
          : {
              kind: "line",
              username: providerResult.username,
              password: providerResult.password,
              packageId: request.packageId,
              packageName: providerResult.packageName,
              expiresAt: providerResult.expiresAt,
              delivery: { status: "pending", maskedPhone: maskPhone(phone) },
            };

      // The demo already exists and is valid. Delivery only decides where the
      // visitor reads it, so nothing below may turn into a failed generation.
      const status: DemoDeliveryStatus = whatsapp.isConfigured()
        ? await sendWithOneRetry(whatsapp, {
            phone,
            message: buildCredentialMessage(credentials),
          })
        : "disabled";

      try {
        await repository.recordDelivery({ requestId: request.id, status });
      } catch {
        // The visitor already has the demo; only the audit trail is behind.
      }

      const delivery: DemoDeliveryView = { status, maskedPhone: maskPhone(phone) };
      if (whatsappIsOnlyChannel() && status !== "disabled") {
        return {
          kind: "delivered",
          packageId: request.packageId,
          packageName: providerResult.packageName,
          expiresAt: providerResult.expiresAt,
          delivery,
        };
      }
      return { ...credentials, delivery };
    },
  };
}
