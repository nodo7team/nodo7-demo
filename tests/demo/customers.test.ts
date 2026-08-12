// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  matchesCustomer,
  toAdminCustomerView,
  whatsappLink,
} from "@/lib/demo/customers";
import { summarizeCodes } from "@/lib/demo/metrics";
import type { AdminCodeView } from "@/lib/demo/admin-client";
import type { DemoCustomerWithDemos } from "@/lib/demo/repository";

function customer(
  overrides: Partial<DemoCustomerWithDemos> = {},
): DemoCustomerWithDemos {
  return {
    id: "customer-1",
    phone: "5493465551234",
    email: "maria@ejemplo.com",
    name: "María López",
    countryIso: "AR",
    marketingConsent: true,
    consentAt: "2026-07-20T10:00:00.000Z",
    firstSeenAt: "2026-07-20T10:00:00.000Z",
    lastSeenAt: "2026-08-01T10:00:00.000Z",
    demos: [],
    ...overrides,
  };
}

function code(overrides: Partial<AdminCodeView> = {}): AdminCodeView {
  return {
    id: "code-1",
    displaySuffix: "ABCD",
    credentialType: "line",
    status: "pending",
    generationAttemptCount: 0,
    activationIp: null,
    activatedAt: null,
    sessionDeadline: null,
    usedAt: null,
    revokedAt: null,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    request: null,
    ...overrides,
  };
}

function request(
  overrides: Partial<NonNullable<AdminCodeView["request"]>> = {},
): NonNullable<AdminCodeView["request"]> {
  return {
    name: "María",
    packageId: 7,
    status: "ok",
    attemptCount: 1,
    username: "demo-user",
    maskedPhone: "+54 934…1234",
    deliveryStatus: "sent",
    providerExpiresAt: null,
    errorCode: null,
    ...overrides,
  };
}

describe("customer list view", () => {
  it("summarises the demos and reads the latest one, whatever the order", () => {
    const view = toAdminCustomerView(
      customer({
        demos: [
          {
            packageId: 6,
            status: "ok",
            deliveryStatus: "sent",
            createdAt: "2026-07-20T10:00:00.000Z",
          },
          {
            packageId: 7,
            status: "error",
            deliveryStatus: "failed",
            createdAt: "2026-08-01T10:00:00.000Z",
          },
        ],
      }),
    );
    expect(view.demoCount).toBe(2);
    expect(view.deliveredCount).toBe(1);
    expect(view.lastPackageId).toBe(7);
    expect(view.lastDeliveryStatus).toBe("failed");
    expect(view.lastDemoAt).toBe("2026-08-01T10:00:00.000Z");
  });

  it("resolves the country the visitor chose into a readable name", () => {
    expect(toAdminCustomerView(customer()).countryName).toBe("Argentina");
    expect(
      toAdminCustomerView(customer({ countryIso: null })).countryName,
    ).toBeNull();
  });

  it("keeps a customer with no demo yet readable instead of throwing", () => {
    const view = toAdminCustomerView(customer());
    expect(view.demoCount).toBe(0);
    expect(view.lastPackageId).toBeNull();
    expect(view.lastDemoAt).toBeNull();
  });

  it("builds a wa.me link the operator can open", () => {
    expect(whatsappLink("5493465551234")).toBe("https://wa.me/5493465551234");
  });


  it("finds a customer by name, address, country or part of the number", () => {
    const view = toAdminCustomerView(customer());
    for (const needle of ["maría", "LÓPEZ", "ejemplo.com", "argentina", "5551234", "(346) 555-1234"]) {
      expect(matchesCustomer(view, needle)).toBe(true);
    }
    expect(matchesCustomer(view, "juan")).toBe(false);
    expect(matchesCustomer(view, "  ")).toBe(true);
  });
});

describe("admin metrics", () => {
  it("counts only delivered demos as conversions", () => {
    const metrics = summarizeCodes([
      code({ status: "pending" }),
      code({ activatedAt: "2026-08-01T10:05:00.000Z", request: request() }),
      code({
        activatedAt: "2026-08-01T10:06:00.000Z",
        request: request({ packageId: 6, deliveryStatus: "failed" }),
      }),
      code({
        activatedAt: "2026-08-01T10:07:00.000Z",
        request: request({ status: "error" }),
      }),
    ]);
    expect(metrics).toEqual({
      issued: 4,
      activated: 3,
      delivered: 2,
      sent: 1,
      conversion: 0.5,
      fullHour: 1,
      longDemo: 1,
    });
  });

  it("reports a zero conversion instead of dividing by nothing", () => {
    expect(summarizeCodes([]).conversion).toBe(0);
  });
});
