import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
  crons?: Array<{ path: string; schedule: string }>;
  functions?: Record<string, { maxDuration?: number }>;
};

describe("Vercel scheduled jobs", () => {
  it("runs demo cleanup once per day", () => {
    expect(config.crons).toContainEqual({
      path: "/api/cron/demo-cleanup",
      schedule: "0 3 * * *",
    });
  });

  /**
   * A demo lasts one or four hours, so a daily job would ask how it went the
   * next morning. Every quarter of an hour keeps the question close to the
   * moment the picture went out.
   */
  it("checks for follow-ups every quarter of an hour", () => {
    expect(config.crons).toContainEqual({
      path: "/api/cron/demo-followup",
      schedule: "*/15 * * * *",
    });
  });

  it("gives the follow-up room to space its messages out", () => {
    // Fifteen messages two seconds apart cannot fit in the default window.
    const followup = config.functions?.["app/api/cron/demo-followup/route.ts"];
    expect(followup?.maxDuration).toBeGreaterThanOrEqual(60);
  });
});
