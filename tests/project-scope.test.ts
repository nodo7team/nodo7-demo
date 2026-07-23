// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("NODO7 product scope", () => {
  it.each([
    "app/(authed)/activity",
    "app/(authed)/clients",
    "app/(authed)/dashboard",
    "app/(authed)/lines",
    "app/(authed)/sales",
    "app/(authed)/templates",
    "app/(authed)/settings",
    "app/api/activity",
    "app/api/clients",
    "app/api/lines",
    "app/api/raptor",
    "app/api/sales",
    "app/api/sync",
    "app/api/templates",
    "lib/platforms/clicktv.ts",
    "lib/platforms/raptor.ts",
    "lib/platforms/sheets.ts",
    "lib/platforms/sync.ts",
  ])("does not ship %s", (path) => expect(existsSync(path)).toBe(false));

  it("ships only NODO7 manifest copy", () => {
    const manifest = readFileSync("public/manifest.json", "utf8");
    expect(manifest).toContain("NODO7");
    expect(manifest).not.toMatch(/OptiMind|Raptor|ClickTV/i);
  });

  it("documents the disabled-by-default provider and isolated deployment", () => {
    const readme = readFileSync("README.md", "utf8");
    expect(readme).toContain("DEMO_PROVIDER=disabled");
    expect(readme).toMatch(/cuenta.*NODO7/i);
    expect(readme).toMatch(/contrato.*API/i);
  });
});
