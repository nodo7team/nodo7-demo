import type { DemoCredentialType } from "@/lib/demo/types";

/**
 * The portal lives at two addresses, one per kind of access. The seller sends
 * the link that matches the pass, so a visitor never has to choose a mode they
 * know nothing about.
 */
export const DEMO_PAGE_PATH: Record<DemoCredentialType, string> = {
  line: "/demo",
  activecode: "/demo/activecode",
};

export const DEMO_PAGE_CREDENTIAL_TYPES = ["line", "activecode"] as const;
