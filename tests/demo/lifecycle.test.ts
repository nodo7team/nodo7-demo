import { describe, expect, it } from "vitest";
import { classifyAccess, startDeadline } from "@/lib/demo/lifecycle";

describe("demo lifecycle", () => {
  const now = new Date("2026-07-22T12:00:00.000Z");

  it("starts exactly ten minutes after activation", () => {
    expect(startDeadline(now).toISOString()).toBe("2026-07-22T12:10:00.000Z");
  });

  it("keeps pending codes timeless", () => {
    expect(
      classifyAccess({ status: "pending", sessionDeadline: null }, now),
    ).toBe("pending");
  });

  it("expires active codes at the server deadline", () => {
    expect(
      classifyAccess(
        {
          status: "active",
          sessionDeadline: "2026-07-22T11:59:59.000Z",
        },
        now,
      ),
    ).toBe("expired");
  });

  it("keeps an active code valid until its deadline", () => {
    expect(
      classifyAccess(
        {
          status: "active",
          sessionDeadline: "2026-07-22T12:00:00.001Z",
        },
        now,
      ),
    ).toBe("active");
  });

  it("preserves terminal states", () => {
    expect(classifyAccess({ status: "used", sessionDeadline: null }, now)).toBe(
      "used",
    );
    expect(
      classifyAccess({ status: "revoked", sessionDeadline: null }, now),
    ).toBe("revoked");
  });
});
