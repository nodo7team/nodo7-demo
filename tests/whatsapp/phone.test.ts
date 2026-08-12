// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  COUNTRY_CODES,
  detectCountry,
  findCountry,
  formatPhone,
  maskPhone,
  matchesCountry,
  normalizePhone,
} from "@/lib/whatsapp/phone";

describe("phone normalization", () => {
  it("joins the country with a local number written any way", () => {
    expect(normalizePhone("US", "(346) 555-1234")).toBe("13465551234");
    expect(normalizePhone("US", "346-555-1234")).toBe("13465551234");
    expect(normalizePhone("US", "346 555 1234")).toBe("13465551234");
  });

  it("keeps international numbers outside the United States", () => {
    expect(normalizePhone("MX", "55 1234 5678")).toBe("525512345678");
    expect(normalizePhone("CO", "301 234 5678")).toBe("573012345678");
  });

  it("drops the trunk zero that local formats carry", () => {
    expect(normalizePhone("GB", "07911 123456")).toBe("447911123456");
    expect(normalizePhone("DE", "0176 12345678")).toBe("4917612345678");
  });

  it("rejects ranges reserved for fiction, which look real but reach nobody", () => {
    // Ofcom keeps 07700 900xxx for film and television. The old length-only
    // check waved these through and burned the visitor's pass on a number that
    // could never receive the credentials.
    expect(normalizePhone("GB", "07700 900123")).toBeNull();
    expect(normalizePhone("US", "555 555 5555")).toBeNull();
  });

  it("adds the mobile nine that Argentine numbers need on WhatsApp", () => {
    // check_number accepts both forms, but /send delivers them to different
    // JIDs, so a missing nine sends the credentials to the wrong person.
    // libphonenumber calls the form without the nine valid, so this rule has
    // to survive on top of it rather than be replaced by it.
    expect(normalizePhone("AR", "2612136248")).toBe("5492612136248");
    expect(normalizePhone("AR", "0261 213-6248")).toBe("5492612136248");
    expect(normalizePhone("AR", "11 5555-1234")).toBe("5491155551234");
  });

  it("does not double the nine when the visitor already wrote it", () => {
    expect(normalizePhone("AR", "9 261 213-6248")).toBe("5492612136248");
    expect(normalizePhone("AR", "+54 9 261 213 6248")).toBe("5492612136248");
  });

  it("drops the 15 that Argentine mobiles carry when dialled locally", () => {
    expect(normalizePhone("AR", "0261 15 213-6248")).toBe("5492612136248");
  });

  it("does not repeat a dial code the visitor already typed", () => {
    expect(normalizePhone("US", "1 346 555 1234")).toBe("13465551234");
    expect(normalizePhone("US", "+1 346 555 1234")).toBe("13465551234");
  });

  it("rejects what cannot be a reachable number", () => {
    expect(normalizePhone("US", "123")).toBeNull();
    expect(normalizePhone("US", "")).toBeNull();
    expect(normalizePhone("US", "abc")).toBeNull();
    expect(normalizePhone("ZZ", "3465551234")).toBeNull();
    // E.164 allows at most fifteen digits.
    expect(normalizePhone("US", "3465551234567890")).toBeNull();
  });

  it("masks a number for display without revealing it whole", () => {
    expect(maskPhone("13465551234")).toBe("+1 346…1234");
    expect(maskPhone(null)).toBeNull();
  });
});

/**
 * Every +1 territory used to carry a compound "1809"-style code that was
 * prepended to numbers already holding their own area code, producing
 * fourteen-digit numbers that reached nobody.
 */
describe("shared +1 territories", () => {
  it.each([
    ["DO", "8095551234", "18095551234"],
    ["DO", "8295551234", "18295551234"],
    ["DO", "8495551234", "18495551234"],
    ["PR", "7875551234", "17875551234"],
    ["PR", "9395551234", "19395551234"],
    ["JM", "8765551234", "18765551234"],
    ["TT", "8685551234", "18685551234"],
    ["BS", "2425551234", "12425551234"],
    ["BB", "2465551234", "12465551234"],
    ["DM", "7675551234", "17675551234"],
    ["GD", "4735551234", "14735551234"],
  ])("routes %s %s to %s", (iso, typed, expected) => {
    expect(normalizePhone(iso, typed)).toBe(expected);
  });

  it("gives every +1 territory the calling code it really has", () => {
    for (const iso of ["US", "CA", "DO", "PR", "JM", "BS", "TT", "KY", "VI"]) {
      expect(findCountry(iso)?.dial).toBe("1");
    }
  });

  it("keeps the area codes so they can still be searched for", () => {
    expect(findCountry("DO")?.areaCodes).toEqual(["809", "829", "849"]);
    expect(findCountry("PR")?.areaCodes).toEqual(["787", "939"]);
  });
});

describe("country detection", () => {
  it("follows the number when it belongs to another +1 territory", () => {
    expect(detectCountry("DO", "7875551234")).toBe("PR");
    expect(detectCountry("PR", "8095551234")).toBe("DO");
  });

  it("stays quiet when the number agrees with the choice", () => {
    expect(detectCountry("DO", "8295551234")).toBeNull();
    expect(detectCountry("US", "3465551234")).toBeNull();
  });

  it("stays quiet while the number is still incomplete", () => {
    expect(detectCountry("DO", "80")).toBeNull();
    expect(detectCountry("DO", "")).toBeNull();
  });

  it("ignores a country that does not exist", () => {
    expect(detectCountry("ZZ", "8095551234")).toBeNull();
  });
});

describe("country search", () => {
  const dominican = findCountry("DO")!;

  it("matches by name, ignoring accents and case", () => {
    expect(matchesCountry(dominican, "domi")).toBe(true);
    expect(matchesCountry(findCountry("MX")!, "mexico")).toBe(true);
    expect(matchesCountry(findCountry("PA")!, "PANAMÁ")).toBe(true);
  });

  it("matches by the area code people think is their country code", () => {
    expect(matchesCountry(dominican, "809")).toBe(true);
    expect(matchesCountry(dominican, "829")).toBe(true);
    expect(matchesCountry(findCountry("PR")!, "939")).toBe(true);
    expect(matchesCountry(dominican, "787")).toBe(false);
  });

  it("matches by calling code with or without the plus", () => {
    expect(matchesCountry(findCountry("AR")!, "54")).toBe(true);
    expect(matchesCountry(findCountry("AR")!, "+54")).toBe(true);
  });

  it("matches by ISO code", () => {
    expect(matchesCountry(dominican, "do")).toBe(true);
    expect(matchesCountry(dominican, "ar")).toBe(false);
  });

  it("returns everything for an empty search", () => {
    expect(matchesCountry(dominican, "  ")).toBe(true);
  });
});

describe("country codes", () => {
  it("offers the United States first because it is the main market", () => {
    expect(COUNTRY_CODES[0]).toMatchObject({ iso: "US", dial: "1" });
  });

  it("covers every country libphonenumber can parse", () => {
    const isoCodes = COUNTRY_CODES.map((country) => country.iso);
    for (const expected of ["US", "MX", "AR", "ES", "CO", "BR", "IN", "NG", "AU"]) {
      expect(isoCodes).toContain(expected);
    }
    // The Caribbean territories that used to be missing entirely.
    for (const expected of ["AG", "KY", "LC", "VC", "VG", "VI", "TC", "SX"]) {
      expect(isoCodes).toContain(expected);
    }
    expect(COUNTRY_CODES.length).toBeGreaterThan(240);
  });

  it("never repeats a country", () => {
    const isoCodes = COUNTRY_CODES.map((country) => country.iso);
    expect(new Set(isoCodes).size).toBe(isoCodes.length);
  });

  it("never stores an area code as if it were a calling code", () => {
    for (const country of COUNTRY_CODES) {
      expect(country.dial).not.toMatch(/^1\d+$/);
    }
  });

  it("names every country in Spanish", () => {
    for (const country of COUNTRY_CODES) {
      expect(country.name).not.toBe(country.iso);
      expect(country.name.length).toBeGreaterThan(2);
    }
  });

  it("finds a country by its code", () => {
    expect(findCountry("MX")?.dial).toBe("52");
    expect(findCountry("ZZ")).toBeUndefined();
  });

  it("formats a stored number back into something readable", () => {
    expect(formatPhone("13465551234")).toBe("+1 346 555 1234");
    expect(formatPhone("18295551234")).toBe("+1 829 555 1234");
  });
});
