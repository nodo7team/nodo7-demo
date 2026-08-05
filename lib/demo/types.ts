export type AccessCodeStatus =
  | "pending"
  | "active"
  | "used"
  | "expired"
  | "revoked";

export type DemoRequestStatus = "creating" | "error" | "ambiguous" | "ok";

export type DemoPackageId = 6 | 7;

/** What the visitor receives: a username/password pair, or an activation code. */
export type DemoCredentialType = "line" | "activecode";

export interface EncryptedCredential {
  ciphertext: string;
  iv: string;
  tag: string;
}

/** `sent` means the panel accepted the message, never that it was delivered. */
export type DemoDeliveryStatus = "pending" | "sent" | "failed" | "disabled";

export interface DemoDeliveryView {
  status: DemoDeliveryStatus;
  maskedPhone: string | null;
}

/**
 * The `delivered` variant carries no credentials at all: when WhatsApp is the
 * only channel, the secret never reaches the browser instead of being hidden
 * there.
 */
export type DemoResultView =
  | {
      kind: "line";
      username: string;
      password: string;
      packageId: DemoPackageId;
      packageName: string;
      expiresAt: string | null;
      delivery: DemoDeliveryView;
    }
  | {
      kind: "activecode";
      code: string;
      packageId: DemoPackageId;
      packageName: string;
      expiresAt: null;
      delivery: DemoDeliveryView;
    }
  | {
      kind: "delivered";
      packageId: DemoPackageId;
      packageName: string;
      expiresAt: string | null;
      delivery: DemoDeliveryView;
    };

export type DemoSessionView =
  | { state: "none" | "expired" }
  | {
      state: "setup";
      deadline: string;
      remainingSeconds: number;
      /** True when the credentials will never appear on screen, so a wrong
       * phone number leaves the visitor with nothing. */
      deliveryOnly: boolean;
    }
  | {
      state: "result";
      deadline: string;
      remainingSeconds: number;
      result: DemoResultView;
    };
