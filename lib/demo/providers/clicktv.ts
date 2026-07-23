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

const CREDENTIAL_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

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

function normalizeFirstName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  const normalized = first
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12);
  return normalized || "cliente";
}

function deterministicCredentials(input: DemoProviderInput) {
  const digest = hashSecret(`provider:${input.idempotencyKey}`);
  const suffix = String(Number.parseInt(digest.slice(0, 8), 16) % 1_000)
    .padStart(3, "0");
  const password = Array.from({ length: 8 }, (_, index) => {
    const offset = 8 + index * 2;
    const byte = Number.parseInt(digest.slice(offset, offset + 2), 16);
    return CREDENTIAL_ALPHABET[byte % CREDENTIAL_ALPHABET.length];
  }).join("");

  return {
    username: `${normalizeFirstName(input.name)}tv${suffix}`,
    password,
  };
}

class ClickTvDemoProvider implements DemoProvider {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: ClickTvProviderOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async createDemo(input: DemoProviderInput): Promise<DemoProviderResult> {
    const credentials = deterministicCredentials(input);
    const url = new URL(this.options.baseUrl);
    const form = new URLSearchParams({
      api_key: this.options.apiKey,
      action: "create_line",
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
    if (payload.status !== "STATUS_SUCCESS") {
      const usernameExists = payload.status === "STATUS_EXISTS_USERNAME";
      throw new DemoProviderError(
        usernameExists ? "PROVIDER_USERNAME_EXISTS" : "PROVIDER_REJECTED",
        usernameExists ? "ambiguous" : "explicit",
      );
    }
    if (
      !payload.data ||
      typeof payload.data !== "object" ||
      Array.isArray(payload.data)
    ) {
      throw new DemoProviderError("PROVIDER_INVALID_RESPONSE", "ambiguous");
    }

    const data = payload.data;
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
