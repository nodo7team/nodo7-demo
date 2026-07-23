import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Vercel Hobby configuration", () => {
  it("runs demo cleanup only once per day", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      crons?: Array<{ path: string; schedule: string }>;
    };

    expect(config.crons).toContainEqual({
      path: "/api/cron/demo-cleanup",
      schedule: "0 3 * * *",
    });
  });
});
