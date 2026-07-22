import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";
import type { EncryptedCredential } from "@/lib/demo/types";

const ACCESS_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ACCESS_CODE_GROUPS = 5;
const ACCESS_CODE_GROUP_SIZE = 4;

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function credentialKey(): Buffer {
  const key = Buffer.from(requiredEnvironmentValue("DEMO_CREDENTIALS_KEY"), "base64");
  if (key.length !== 32) {
    throw new Error("DEMO_CREDENTIALS_KEY must be a base64-encoded 32-byte key");
  }
  return key;
}

export function generateAccessCode(): string {
  const characters = Array.from(
    randomBytes(ACCESS_CODE_GROUPS * ACCESS_CODE_GROUP_SIZE),
    (byte) => ACCESS_CODE_ALPHABET[byte & 31],
  );
  const groups = Array.from({ length: ACCESS_CODE_GROUPS }, (_, index) =>
    characters
      .slice(index * ACCESS_CODE_GROUP_SIZE, (index + 1) * ACCESS_CODE_GROUP_SIZE)
      .join(""),
  );
  return `N7-${groups.join("-")}`;
}

export function hashSecret(value: string): string {
  return createHmac("sha256", requiredEnvironmentValue("DEMO_HASH_SECRET"))
    .update(value)
    .digest("hex");
}

export function encryptCredential(value: string): EncryptedCredential {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", credentialKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptCredential(payload: EncryptedCredential): string {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    credentialKey(),
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
