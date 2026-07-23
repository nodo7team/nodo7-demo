import { hashSecret } from "@/lib/demo/secrets";
import {
  DemoProviderError,
  type DemoProvider,
  type DemoProviderInput,
  type DemoProviderResult,
} from "@/lib/demo/provider";

interface ClickTvProviderOptions {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}

type ProviderPayload = Record<string, any>;

function packageName(packageId: 6 | 7): string {
  return packageId === 7 ? "1 hora FULL" : "4 horas";
}

function parseExpiration(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return null;
  const milliseconds = numeric > 10_000_000_000 ? numeric : numeric * 1_000;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function deterministicCredentials(idempotencyKey: string) {
  const compact = idempotencyKey.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const digest = hashSecret(`provider:${idempotencyKey}`);
  return {
    username: `n7${compact.slice(0, 12)}`,
    password: `${digest.slice(0, 10)}A7!`,
  };
}

class ClickTvDemoProvider implements DemoProvider {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: ClickTvProviderOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async createDemo(input: DemoProviderInput): Promise<DemoProviderResult> {
    const credentials = deterministicCredentials(input.idempotencyKey);
    const url = new URL(this.options.baseUrl);
    url.searchParams.set("api_key", this.options.apiKey);
    url.searchParams.set("action", "create_line");
    const form = new URLSearchParams({
      package: String(input.packageId),
      trial: "1",
      is_isplock: "0",
      username: credentials.username,
      password: credentials.password,
    });

    let response: Response;
    try {
      response = await this.fetchImpl(url.toString(), {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: form.toString(),
        cache: "no-store",
      });
    } catch {
      throw new DemoProviderError("PROVIDER_NETWORK_ERROR", "ambiguous");
    }

    if (!response.ok) {
      throw new DemoProviderError(
        `PROVIDER_HTTP_${response.status}`,
        response.status >= 500 ? "ambiguous" : "explicit",
      );
    }

    let payload: ProviderPayload;
    try {
      payload = (await response.json()) as ProviderPayload;
    } catch {
      throw new DemoProviderError("PROVIDER_INVALID_RESPONSE", "ambiguous");
    }
    if (payload.result === false || payload.error) {
      throw new DemoProviderError("PROVIDER_REJECTED", "explicit");
    }

    const data =
      payload.data && typeof payload.data === "object" ? payload.data : payload;
    return {
      externalId: String(data.id ?? credentials.username),
      username: String(data.username ?? credentials.username),
      password: String(data.password ?? credentials.password),
      expiresAt: parseExpiration(data.exp_date),
      packageName: packageName(input.packageId),
    };
  }
}

export function createClickTvDemoProvider(
  options: ClickTvProviderOptions,
): DemoProvider {
  return new ClickTvDemoProvider(options);
}
