import { packageName } from "@/lib/demo/packages";
import { hashSecret } from "@/lib/demo/secrets";
import {
  DemoProviderError,
  type DemoProvider,
  type DemoProviderInput,
  type DemoProviderResult,
} from "@/lib/demo/provider";
import type { DemoCredentialType } from "@/lib/demo/types";

interface ClickTvProviderOptions {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
}

type ProviderPayload = Record<string, any>;

const CREDENTIAL_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/**
 * Rejections that always mean the panel created nothing, so the caller may fail
 * cleanly. Anything outside this set is only safe to treat as explicit when the
 * action has a dedicated duplicate status to distinguish it.
 */
const CONFIGURATION_REJECTIONS = new Set([
  "STATUS_INVALID_PACKAGE",
  "STATUS_NO_TRIALS",
  "STATUS_INSUFFICIENT_CREDITS",
  "STATUS_NO_PERMISSIONS",
  "STATUS_INVALID_TYPE",
  "STATUS_INVALID_DATA",
  "STATUS_INVALID_USERNAME",
  "STATUS_INVALID_PASSWORD",
]);

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
    .replace(/\p{Mn}/gu, "")
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

/**
 * Digits only, because the visitor types this into a TV remote where letters
 * mean cycling through a keyboard.
 *
 * Derived from the idempotency key so a retry submits the same code and the
 * panel rejects the duplicate instead of leaving a second demo behind. The
 * panel never echoes a code back, so whatever we send here is the only code
 * that will ever exist for this demo.
 */
function deterministicActivationCode(idempotencyKey: string): string {
  const digest = hashSecret(`activecode:${idempotencyKey}`);
  return Array.from({ length: 10 }, (_, index) => {
    const byte = Number.parseInt(digest.slice(index * 2, index * 2 + 2), 16);
    return String(byte % 10);
  }).join("");
}

function rejectionFor(
  status: unknown,
  credentialType: DemoCredentialType,
): DemoProviderError {
  const value = typeof status === "string" ? status : "STATUS_UNKNOWN";

  if (credentialType === "line") {
    return value === "STATUS_EXISTS_USERNAME"
      ? new DemoProviderError("PROVIDER_USERNAME_EXISTS", "ambiguous")
      : new DemoProviderError("PROVIDER_REJECTED", "explicit");
  }

  // The panel issues its own activation code, so nothing on our side identifies
  // an earlier attempt. Any rejection outside the configuration set may hide a
  // code that was already created, and a retry would create a second one.
  return CONFIGURATION_REJECTIONS.has(value)
    ? new DemoProviderError("PROVIDER_REJECTED", "explicit")
    : new DemoProviderError("PROVIDER_CODE_UNCERTAIN", "ambiguous");
}

class ClickTvDemoProvider implements DemoProvider {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: ClickTvProviderOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async createDemo(input: DemoProviderInput): Promise<DemoProviderResult> {
    const activation = input.credentialType === "activecode";
    const credentials = activation ? null : deterministicCredentials(input);
    const activationCode = activation
      ? deterministicActivationCode(input.idempotencyKey)
      : null;

    const form = new URLSearchParams({
      api_key: this.options.apiKey,
      action: activation ? "create_activecode" : "create_line",
      package: String(input.packageId),
      // A line starts its trial the moment it exists, so trial=1 is right for
      // it. An activation code must start when the visitor redeems it: with
      // trial=1 the panel stamps exp_date at creation, the demo is already
      // spent, and the app finds nothing left to activate. Verified against a
      // code created by hand in the panel, whose exp_date is null.
      trial: activation ? "0" : "1",
      is_isplock: "0",
      reseller_notes: input.name,
    });
    if (credentials) {
      form.set("username", credentials.username);
      form.set("password", credentials.password);
    }
    if (activationCode) {
      form.set("code", activationCode);
    }

    let response: Response;
    try {
      response = await this.fetchImpl(new URL(this.options.baseUrl).toString(), {
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
      throw rejectionFor(payload.status, input.credentialType);
    }
    if (
      !payload.data ||
      typeof payload.data !== "object" ||
      Array.isArray(payload.data)
    ) {
      throw new DemoProviderError("PROVIDER_INVALID_RESPONSE", "ambiguous");
    }

    const data = payload.data;
    if (activationCode) {
      // create_activecode answers without a code field, so the one we
      // submitted is the demo's only activation code.
      const echoed = typeof data.code === "string" ? data.code.trim() : "";
      return {
        kind: "activecode",
        externalId: String(data.id ?? activationCode),
        code: echoed || activationCode,
        expiresAt: null,
        packageName: packageName(input.packageId),
      };
    }

    return {
      kind: "line",
      externalId: String(data.id ?? credentials!.username),
      username: String(data.username ?? credentials!.username),
      password: String(data.password ?? credentials!.password),
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
