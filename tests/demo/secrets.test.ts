import { beforeEach, describe, expect, it } from "vitest";
import {
  decryptCredential,
  encryptCredential,
  generateAccessCode,
  hashSecret,
} from "@/lib/demo/secrets";

beforeEach(() => {
  process.env.DEMO_HASH_SECRET = "h".repeat(64);
  process.env.DEMO_CREDENTIALS_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("demo secrets", () => {
  it("generates a grouped code with twenty random base32 characters", () => {
    expect(generateAccessCode()).toMatch(/^N7(?:-[A-Z2-9]{4}){5}$/);
  });

  it("does not generate ambiguous characters", () => {
    const generated = Array.from({ length: 100 }, () => generateAccessCode());
    expect(generated.join("")).not.toMatch(/[01IO]/);
  });

  it("hashes deterministically without returning plaintext", () => {
    const value = "N7-AAAA-BBBB-CCCC-DDDD-EEEE";
    const first = hashSecret(value);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).toBe(hashSecret(value));
    expect(first).not.toContain(value);
  });

  it("round-trips encrypted credentials", () => {
    const encrypted = encryptCredential("secret-password");
    expect(encrypted.ciphertext).not.toContain("secret-password");
    expect(decryptCredential(encrypted)).toBe("secret-password");
  });

  it("uses a fresh IV for each encryption", () => {
    const first = encryptCredential("same-password");
    const second = encryptCredential("same-password");
    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });
});
