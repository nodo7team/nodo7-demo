import type {
  WhatsAppClient,
  WhatsAppConnectionState,
} from "@/lib/whatsapp/client";

interface WaclientOptions {
  accessToken: string;
  instanceId: string;
  expectedPhone?: string;
  /** Confirms the linked number before sending. Needs expectedPhone. */
  verifySender?: boolean;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

type Payload = Record<string, any>;

const DEFAULT_BASE_URL = "https://api.waclient.com";

function digitsOnly(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

class WaclientClient implements WhatsAppClient {
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(private readonly options: WaclientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  }

  isConfigured(): boolean {
    return true;
  }

  /**
   * waclient answers HTTP 200 for its errors too, so the status code decides
   * nothing: only the status field in the body does.
   */
  private async call(
    path: string,
    body: Record<string, unknown>,
  ): Promise<Payload | null> {
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...body,
          instance_id: this.options.instanceId,
          access_token: this.options.accessToken,
        }),
        cache: "no-store",
      });
      const payload = (await response.json()) as Payload;
      return payload?.status === "success" ? payload : null;
    } catch {
      return null;
    }
  }

  async connectionState(): Promise<WhatsAppConnectionState> {
    const payload = await this.call("instance_status", { live: 1 });
    const state = payload?.data?.connection_state;
    if (state === "connected") return "connected";
    return typeof state === "string" ? "disconnected" : "unknown";
  }

  private async connectedPhone(): Promise<string | null> {
    const payload = await this.call("instance_info", {});
    const phone = digitsOnly(payload?.data?.account?.phone);
    return phone || null;
  }

  async numberExists(phone: string): Promise<boolean | null> {
    const payload = await this.call("check_number", { number: phone });
    // The documented data.results[].exists does not exist; the live contract is
    // data.valid. The message field contradicts it for malformed input.
    const valid = payload?.data?.valid;
    if (valid === true) return true;
    if (valid !== false) return null;

    // Only a healthy session can be trusted to say no.
    return (await this.connectionState()) === "connected" ? false : null;
  }

  async sendText(input: { phone: string; message: string }): Promise<boolean> {
    if (this.options.verifySender && this.options.expectedPhone) {
      const linked = await this.connectedPhone();
      if (linked !== digitsOnly(this.options.expectedPhone)) return false;
    }

    const payload = await this.call("send", {
      number: input.phone,
      type: "text",
      message: input.message,
    });
    // A successful send reports PENDING: accepted for delivery, not delivered.
    return payload !== null;
  }
}

export function createWaclientClient(options: WaclientOptions): WhatsAppClient {
  return new WaclientClient(options);
}
