// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildCredentialMessage,
  buildFollowupMessage,
  humanDuration,
} from "@/lib/whatsapp/message";
import type { DemoResultView } from "@/lib/demo/types";

const NOW = new Date("2026-08-12T14:00:00.000Z");

function lineResult(overrides: Partial<DemoResultView> = {}): DemoResultView {
  return {
    kind: "line",
    username: "demo-user",
    password: "demo-pass",
    packageId: 7,
    packageName: "1 hora FULL",
    expiresAt: "2026-08-12T15:00:00.000Z",
    delivery: { status: "sent", maskedPhone: "+1 346…1234" },
    ...overrides,
  } as DemoResultView;
}

beforeEach(() => {
  delete process.env.WHATSAPP_MESSAGE_TEMPLATE;
  delete process.env.WHATSAPP_FOLLOWUP_FULL;
  delete process.env.WHATSAPP_FOLLOWUP_LITE;
});

afterEach(() => {
  delete process.env.WHATSAPP_MESSAGE_TEMPLATE;
  delete process.env.WHATSAPP_FOLLOWUP_FULL;
  delete process.env.WHATSAPP_FOLLOWUP_LITE;
});

describe("how long is left", () => {
  it.each([
    [60, "1 hora"],
    [240, "4 horas"],
    [45, "45 minutos"],
    [1, "1 minuto"],
    [90, "1 hora y 30 minutos"],
    [125, "2 horas y 5 minutos"],
  ])("says %i minutes as %s", (minutes, expected) => {
    expect(humanDuration(minutes)).toBe(expected);
  });
});

describe("the credential message", () => {
  /**
   * The server runs in UTC and cannot know where the visitor is. Quoting a
   * clock time handed an Argentine three hours that did not exist.
   */
  it("counts the time left instead of naming an hour", () => {
    const message = buildCredentialMessage(lineResult(), NOW);
    expect(message).toContain("Vence en 1 hora, desde este momento.");
    expect(message).not.toMatch(/\d\d:\d\d/);
  });

  it("says so plainly when the demo is already over", () => {
    const message = buildCredentialMessage(
      lineResult({ expiresAt: "2026-08-12T13:00:00.000Z" }),
      NOW,
    );
    expect(message).toContain("Tu demo ya venció.");
  });

  it("does not start the clock on an activation code", () => {
    const message = buildCredentialMessage(
      {
        kind: "activecode",
        code: "N7ABCD2345",
        packageId: 7,
        packageName: "1 hora FULL",
        expiresAt: null,
        delivery: { status: "sent", maskedPhone: null },
      },
      NOW,
    );
    expect(message).toContain("El tiempo empieza cuando actives el código.");
    expect(message).toContain("N7ABCD2345");
  });

  it("still carries the credentials and what the plan includes", () => {
    const message = buildCredentialMessage(lineResult(), NOW);
    expect(message).toContain("Usuario: demo-user");
    expect(message).toContain("Contraseña: demo-pass");
    expect(message).toContain("1 hora FULL");
    expect(message).toContain("Incluye deportes en vivo");
  });
});

describe("the follow-up message", () => {
  it("asks about the whole grid for the demo that carried it", () => {
    const message = buildFollowupMessage({ name: "María", packageId: 7 });
    expect(message).toContain("Hola María");
    expect(message).toMatch(/grilla completa/i);
    expect(message).toMatch(/fútbol en vivo/i);
  });

  it("owns up to what the long demo never showed", () => {
    const message = buildFollowupMessage({ name: "Jorge", packageId: 6 });
    expect(message).toMatch(/grilla recortada/i);
    expect(message).toMatch(/sin fútbol/i);
  });

  it("sells nothing, because it was asked to only ask", () => {
    for (const packageId of [6, 7] as const) {
      const message = buildFollowupMessage({ name: "Ana", packageId });
      expect(message).not.toMatch(/precio|oferta|contrat|compr|\$/i);
    }
  });

  it("uses the first name, never the whole one", () => {
    expect(buildFollowupMessage({ name: "  ana maría sosa ", packageId: 7 }))
      .toContain("Hola ana");
  });

  it("can be reworded from the environment without a deploy", () => {
    process.env.WHATSAPP_FOLLOWUP_FULL = "Hola {nombre}, ¿qué tal {paquete}?";
    expect(buildFollowupMessage({ name: "María", packageId: 7 })).toBe(
      "Hola María, ¿qué tal 1 hora FULL?",
    );
  });
});
