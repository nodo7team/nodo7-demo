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

export type DemoResultView =
  | {
      kind: "line";
      username: string;
      password: string;
      packageId: DemoPackageId;
      packageName: string;
      expiresAt: string | null;
    }
  | {
      kind: "activecode";
      code: string;
      packageId: DemoPackageId;
      packageName: string;
      expiresAt: null;
    };

export type DemoSessionView =
  | { state: "none" | "expired" }
  | { state: "setup"; deadline: string; remainingSeconds: number }
  | {
      state: "result";
      deadline: string;
      remainingSeconds: number;
      result: DemoResultView;
    };
