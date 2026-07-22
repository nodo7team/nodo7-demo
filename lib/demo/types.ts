export type AccessCodeStatus =
  | "pending"
  | "active"
  | "used"
  | "expired"
  | "revoked";

export type DemoRequestStatus = "creating" | "error" | "ambiguous" | "ok";

export type DemoPackageId = 6 | 7;

export interface EncryptedCredential {
  ciphertext: string;
  iv: string;
  tag: string;
}

export interface DemoResultView {
  username: string;
  password: string;
  packageId: DemoPackageId;
  packageName: string;
  expiresAt: string | null;
}

export type DemoSessionView =
  | { state: "none" | "expired" }
  | { state: "setup"; deadline: string; remainingSeconds: number }
  | {
      state: "result";
      deadline: string;
      remainingSeconds: number;
      result: DemoResultView;
    };
