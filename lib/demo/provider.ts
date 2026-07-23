import { createClickTvDemoProvider } from "@/lib/demo/providers/clicktv";
import type { DemoPackageId } from "@/lib/demo/types";

export interface DemoProviderInput {
  name: string;
  packageId: DemoPackageId;
  idempotencyKey: string;
}

export interface DemoProviderResult {
  externalId: string;
  username: string;
  password: string;
  expiresAt: string | null;
  packageName: string;
}

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
