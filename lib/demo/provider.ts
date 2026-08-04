import { createClickTvDemoProvider } from "@/lib/demo/providers/clicktv";
import type { DemoCredentialType, DemoPackageId } from "@/lib/demo/types";

export interface DemoProviderInput {
  name: string;
  packageId: DemoPackageId;
  credentialType: DemoCredentialType;
  idempotencyKey: string;
}

/**
 * The panel exposes two sibling operations with different payloads, so the
 * result is a union: an activation code has no username and never carries an
 * expiration, because the line is only created when the code is redeemed.
 */
export type DemoProviderResult =
  | {
      kind: "line";
      externalId: string;
      username: string;
      password: string;
      expiresAt: string | null;
      packageName: string;
    }
  | {
      kind: "activecode";
      externalId: string;
      code: string;
      expiresAt: null;
      packageName: string;
    };

export interface DemoProvider {
  createDemo(input: DemoProviderInput): Promise<DemoProviderResult>;
}

export type DemoProviderOutcome = "explicit" | "ambiguous";

export class DemoProviderError extends Error {
  constructor(
    public readonly code: string,
    public readonly outcome: DemoProviderOutcome,
  ) {
    super(code);
    this.name = "DemoProviderError";
  }
}

const disabledProvider: DemoProvider = {
  async createDemo() {
    throw new DemoProviderError("PROVIDER_NOT_CONFIGURED", "explicit");
  },
};

export function getDemoProvider(): DemoProvider {
  if (process.env.DEMO_PROVIDER !== "clicktv") return disabledProvider;

  const baseUrl = process.env.DEMO_PROVIDER_BASE_URL;
  const apiKey = process.env.DEMO_PROVIDER_API_KEY;
  if (!baseUrl || !apiKey) return disabledProvider;
  return createClickTvDemoProvider({ baseUrl, apiKey });
}
