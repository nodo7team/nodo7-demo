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
    expect(normalizePhone("52", "55 1234 5678")).toBe("525512345678");
    expect(normalizePhone("57", "301 234 5678")).toBe("573012345678");
  });

  it("drops the trunk zero that local formats carry", () => {
    expect(normalizePhone("44", "07700 900123")).toBe("447700900123");
  });

  it("adds the mobile nine that Argentine numbers need on WhatsApp", () => {
    // check_number accepts both forms, but /send delivers them to different
    // JIDs, so a missing nine sends the credentials to the wrong person.
    expect(normalizePhone("54", "2612136248")).toBe("5492612136248");
    expect(normalizePhone("54", "0261 213-6248")).toBe("5492612136248");
    expect(normalizePhone("54", "11 5555-1234")).toBe("5491155551234");
  });

  it("does not double the nine when the visitor already wrote it", () => {
    expect(normalizePhone("54", "9 261 213-6248")).toBe("5492612136248");
    expect(normalizePhone("54", "+54 9 261 213 6248")).toBe("5492612136248");
  });

  it("drops the 15 that Argentine mobiles carry when dialled locally", () => {
    expect(normalizePhone("54", "0261 15 213-6248")).toBe("5492612136248");
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
