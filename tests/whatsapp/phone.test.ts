// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  COUNTRY_CODES,
  countryFlag,
  findCountry,
  maskPhone,
  normalizePhone,
} from "@/lib/whatsapp/phone";

describe("phone normalization", () => {
  it("joins the dial code with a local number written any way", () => {
    expect(normalizePhone("1", "(346) 555-1234")).toBe("13465551234");
    expect(normalizePhone("1", "346-555-1234")).toBe("13465551234");
    expect(normalizePhone("1", "346 555 1234")).toBe("13465551234");
  });

  it("keeps international numbers outside the United States", () => {
    expect(normalizePhone("54", "9 261 602-7055")).toBe("5492616027055");
    expect(normalizePhone("52", "55 1234 5678")).toBe("525512345678");
  });

  it("drops the trunk zero that local formats carry", () => {
    expect(normalizePhone("54", "0261 602-7055")).toBe("542616027055");
    expect(normalizePhone("44", "07700 900123")).toBe("447700900123");
  });

  it("does not repeat a dial code the visitor already typed", () => {
    expect(normalizePhone("1", "1 346 555 1234")).toBe("13465551234");
    expect(normalizePhone("1", "+1 346 555 1234")).toBe("13465551234");
  });

  it("rejects what cannot be a reachable number", () => {
    expect(normalizePhone("1", "123")).toBeNull();
    expect(normalizePhone("1", "")).toBeNull();
    expect(normalizePhone("1", "abc")).toBeNull();
    expect(normalizePhone("", "3465551234")).toBeNull();
    // E.164 allows at most fifteen digits.
    expect(normalizePhone("1", "3465551234567890")).toBeNull();
  });

  it("masks a number for display without revealing it whole", () => {
    expect(maskPhone("13465551234")).toBe("+1 346…1234");
    expect(maskPhone(null)).toBeNull();
  });
});

describe("country codes", () => {
  it("offers the United States first because it is the main market", () => {
    expect(COUNTRY_CODES[0]).toMatchObject({ iso: "US", dial: "1" });
  });

  it("covers every continent the demos can be requested from", () => {
    const isoCodes = COUNTRY_CODES.map((country) => country.iso);
    for (const expected of ["US", "MX", "AR", "ES", "CO", "BR", "IN", "NG", "AU"]) {
      expect(isoCodes).toContain(expected);
    }
    expect(COUNTRY_CODES.length).toBeGreaterThan(90);
  });

  it("never repeats a country", () => {
    const isoCodes = COUNTRY_CODES.map((country) => country.iso);
    expect(new Set(isoCodes).size).toBe(isoCodes.length);
  });

  it("derives the flag from the country code instead of storing it", () => {
    expect(countryFlag("US")).toBe("🇺🇸");
    expect(countryFlag("AR")).toBe("🇦🇷");
  });

  it("finds a country by its code", () => {
    expect(findCountry("MX")?.dial).toBe("52");
    expect(findCountry("ZZ")).toBeUndefined();
  });
});
