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
  DemoPackageId,
  DemoResultView,
  EncryptedCredential,
} from "@/lib/demo/types";

const GenerateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  packageId: z.union([z.literal(6), z.literal(7)]),
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
  }): Promise<{ record: DemoRequestRecord; created: boolean }>;
  prepareRequestRetry(requestId: string): Promise<DemoRequestRecord | null>;
  completeGeneration(input: {
    sessionHash: string;
    requestId: string;
    externalId: string;
    username: string;
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

export function createDemoGenerator(
  repository: DemoGenerationRepository,
  provider: DemoProvider,
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

      const access = await repository.findBySessionHash(sessionHash);
      if (!sessionIsActive(access, now)) {
        throw new DemoGenerationError("SESSION_UNAVAILABLE", 409);
      }

      const selected = await repository.getOrCreateRequest({
        accessCodeId: access.id,
        name: parsed.data.name,
        packageId: parsed.data.packageId,
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

      const encryptedPassword = encryptCredential(providerResult.password);
      let completed = false;
      try {
        completed = await repository.completeGeneration({
          sessionHash,
          requestId: request.id,
          externalId: providerResult.externalId,
          username: providerResult.username,
          password: encryptedPassword,
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

      return {
        username: providerResult.username,
        password: providerResult.password,
        packageId: request.packageId,
        packageName: providerResult.packageName,
        expiresAt: providerResult.expiresAt,
      };
    },
  };
}
