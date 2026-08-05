// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWaclientClient } from "@/lib/whatsapp/providers/waclient";
import { getWhatsAppClient } from "@/lib/whatsapp/client";

const OPTIONS = {
  accessToken: "private-token",
  instanceId: "INSTANCE1",
  expectedPhone: "13465551234",
};

/** Every waclient answer is HTTP 200, including its errors. */
function reply(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

function bodyOf(fetchImpl: ReturnType<typeof vi.fn>, call = 0): any {
  const [, init] = fetchImpl.mock.calls[call] as [string, RequestInit];
  return JSON.parse(String(init.body));
}

describe("waclient client", () => {
  describe("numberExists", () => {
    it("reads data.valid instead of the documented results array", async () => {
      const fetchImpl = vi.fn().mockResolvedValue(
        reply({
          status: "success",
          message: "WhatsApp number is valid",
          data: { number: "13465551234", valid: true },
        }),
      );
      const client = createWaclientClient({ ...OPTIONS, fetchImpl });

      await expect(client.numberExists("13465551234")).resolves.toBe(true);
      expect(bodyOf(fetchImpl)).toMatchObject({
        number: "13465551234",
        instance_id: "INSTANCE1",
        access_token: "private-token",
      });
    });

    it("ignores the message, which contradicts the data", async () => {
      // A malformed number answers "WhatsApp number is valid" with valid false.
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(
          reply({
            status: "success",
            message: "WhatsApp number is valid",
            data: { number: "123", valid: false },
          }),
        )
        .mockResolvedValueOnce(
          reply({ status: "success", data: { connection_state: "connected" } }),
        );
      const client = createWaclientClient({ ...OPTIONS, fetchImpl });

      await expect(client.numberExists("123")).resolves.toBe(false);
    });

    it("refuses to call a number invalid while the session is down", async () => {
      // A dead instance answers valid:false for every number, so believing it
      // would reject every visitor and blame them for our outage.
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(
          reply({ status: "success", data: { valid: false } }),
        )
        .mockResolvedValueOnce(
          reply({ status: "success", data: { connection_state: "logged_out" } }),
        );
      const client = createWaclientClient({ ...OPTIONS, fetchImpl });

      await expect(client.numberExists("13465551234")).resolves.toBeNull();
    });

    it("confirms a rejection when the session is healthy", async () => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(
          reply({ status: "success", data: { valid: false } }),
        )
        .mockResolvedValueOnce(
          reply({ status: "success", data: { connection_state: "connected" } }),
        );
      const client = createWaclientClient({ ...OPTIONS, fetchImpl });

      await expect(client.numberExists("13465551234")).resolves.toBe(false);
    });

    it("cannot tell when the network fails", async () => {
      const client = createWaclientClient({
        ...OPTIONS,
        fetchImpl: vi.fn().mockRejectedValue(new Error("timeout")),
      });
      await expect(client.numberExists("13465551234")).resolves.toBeNull();
    });
  });

  describe("sendText", () => {
    it("accepts only a success status, never the HTTP code", async () => {
      const fetchImpl = vi.fn().mockResolvedValue(
        reply({
          status: "success",
          message: "Success",
          message_payload: { status: "PENDING" },
        }),
      );
      const client = createWaclientClient({ ...OPTIONS, fetchImpl });

      await expect(
        client.sendText({ phone: "13465551234", message: "hola" }),
      ).resolves.toBe(true);
      expect(bodyOf(fetchImpl)).toMatchObject({
        number: "13465551234",
        type: "text",
        message: "hola",
        instance_id: "INSTANCE1",
      });
    });

    it.each([
      ["Instance ID Invalidated"],
      ["Invalid phone number"],
      ["Access token does not exist"],
    ])("treats the HTTP 200 error %s as a failure", async (message) => {
      const client = createWaclientClient({
        ...OPTIONS,
        fetchImpl: vi.fn().mockResolvedValue(reply({ status: "error", message })),
      });
      await expect(
        client.sendText({ phone: "13465551234", message: "hola" }),
      ).resolves.toBe(false);
    });

    it("fails instead of throwing when the network dies", async () => {
      const client = createWaclientClient({
        ...OPTIONS,
        fetchImpl: vi.fn().mockRejectedValue(new Error("timeout")),
      });
      await expect(
        client.sendText({ phone: "13465551234", message: "hola" }),
      ).resolves.toBe(false);
    });

    it("refuses to send when the instance holds another number", async () => {
      // A relinked session keeps the same instance id but a different phone,
      // so messages would silently leave from someone else's number.
      const fetchImpl = vi.fn().mockResolvedValue(
        reply({
          status: "success",
          data: { account: { phone: "19998887777" } },
        }),
      );
      const client = createWaclientClient({
        ...OPTIONS,
        verifySender: true,
        fetchImpl,
      });

      await expect(
        client.sendText({ phone: "13465551234", message: "hola" }),
      ).resolves.toBe(false);
      expect(fetchImpl.mock.calls).toHaveLength(1);
    });
  });

  describe("configuration", () => {
    beforeEach(() => {
      delete process.env.WHATSAPP_PROVIDER;
      delete process.env.WHATSAPP_ACCESS_TOKEN;
      delete process.env.WHATSAPP_INSTANCE_ID;
    });

    it("stays disabled until the provider is configured", async () => {
      const client = getWhatsAppClient();
      expect(client.isConfigured()).toBe(false);
      await expect(client.numberExists("13465551234")).resolves.toBeNull();
      await expect(
        client.sendText({ phone: "13465551234", message: "hola" }),
      ).resolves.toBe(false);
    });

    it("stays disabled when the credentials are incomplete", () => {
      process.env.WHATSAPP_PROVIDER = "waclient";
      expect(getWhatsAppClient().isConfigured()).toBe(false);
    });

    it("activates once provider and credentials are present", () => {
      process.env.WHATSAPP_PROVIDER = "waclient";
      process.env.WHATSAPP_ACCESS_TOKEN = "private-token";
      process.env.WHATSAPP_INSTANCE_ID = "INSTANCE1";
      expect(getWhatsAppClient().isConfigured()).toBe(true);
    });
  });
});
