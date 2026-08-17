// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  PLAYER_APPS,
  downloaderUrl,
  formatBytes,
  recommendedApp,
} from "@/lib/apps/catalog";

describe("player catalog", () => {
  it("offers both players", () => {
    expect(PLAYER_APPS.map((app) => app.name)).toEqual(["IBO 26", "V3PLAY"]);
  });

  it("recommends exactly one, and lists it first", () => {
    const recommended = PLAYER_APPS.filter((app) => app.recommended);
    expect(recommended).toHaveLength(1);
    expect(PLAYER_APPS[0]).toBe(recommended[0]);
    expect(recommendedApp().name).toBe("IBO 26");
  });

  /**
   * The portal is served over HTTPS. A plain http:// download would be a
   * downgrade the visitor cannot see, on a file they are about to install.
   */
  it("downloads every APK over HTTPS", () => {
    for (const app of PLAYER_APPS) {
      expect(app.apkUrl).toMatch(/^https:\/\//);
      expect(app.apkUrl).toMatch(/\.apk$/);
    }
  });

  it("uses Downloader codes the remote control can actually type", () => {
    for (const app of PLAYER_APPS) {
      expect(app.downloaderCode).toMatch(/^\d{7}$/);
    }
  });

  it("keeps the two players apart", () => {
    const codes = PLAYER_APPS.map((app) => app.downloaderCode);
    expect(new Set(codes).size).toBe(codes.length);
    const urls = PLAYER_APPS.map((app) => app.apkUrl);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("builds the Downloader link from the code", () => {
    expect(downloaderUrl("4616237")).toBe("https://aftv.news/4616237");
  });

  it("states the size the way a Spanish reader writes it", () => {
    expect(formatBytes(32_010_144)).toBe("30,5 MB");
    expect(formatBytes(86_647_364)).toBe("82,6 MB");
  });
});
