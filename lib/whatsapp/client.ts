import { createWaclientClient } from "@/lib/whatsapp/providers/waclient";

export type WhatsAppConnectionState =
  | "connected"
  | "disconnected"
  | "unknown";

export interface WhatsAppClient {
  isConfigured(): boolean;
  /**
   * True when the number is on WhatsApp, false when it is confirmed not to be,
   * and null when the answer cannot be trusted. A dead session reports every
   * number as invalid, so a rejection is only believable while it is healthy.
   */
  numberExists(phone: string): Promise<boolean | null>;
  /** Resolves to whether the panel accepted the message, never throws. */
  sendText(input: { phone: string; message: string }): Promise<boolean>;
  connectionState(): Promise<WhatsAppConnectionState>;
}

const disabledClient: WhatsAppClient = {
  isConfigured: () => false,
  async numberExists() {
    return null;
  },
  async sendText() {
    return false;
  },
  async connectionState() {
    return "unknown";
  },
};

export function getWhatsAppClient(): WhatsAppClient {
  if (process.env.WHATSAPP_PROVIDER !== "waclient") return disabledClient;

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const instanceId = process.env.WHATSAPP_INSTANCE_ID;
  if (!accessToken || !instanceId) return disabledClient;

  return createWaclientClient({
    accessToken,
    instanceId,
    expectedPhone: process.env.WHATSAPP_EXPECTED_PHONE,
    verifySender: Boolean(process.env.WHATSAPP_EXPECTED_PHONE),
  });
}
