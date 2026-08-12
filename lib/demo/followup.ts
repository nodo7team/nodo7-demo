import { findPackage } from "@/lib/demo/packages";
import type { DemoPackageId } from "@/lib/demo/types";
import { getWhatsAppClient, type WhatsAppClient } from "@/lib/whatsapp/client";
import { buildFollowupMessage } from "@/lib/whatsapp/message";

/** An activation code starts when it is redeemed, and the panel never says
 * when that was. Assuming the visitor used it within the hour puts the
 * follow-up close for almost everyone and early for nobody who waited. */
const ACTIVATION_GRACE_MINUTES = 60;

/** Long enough that the picture is really gone, short enough to still matter. */
const SETTLE_MINUTES = 15;

/** A run that catches up after an outage must not wake last week's visitors. */
const MAX_AGE_HOURS = 72;

/** waclient drives WhatsApp Web, not the official API. A burst is what gets a
 * number banned, and at four runs an hour this still clears sixty messages. */
const BATCH_SIZE = 15;
const SPACING_MS = 2_000;

/**
 * Quiet hours in UTC. The default 02:00–12:00 keeps messages out of the night
 * across the Americas — roughly 23:00–09:00 in Argentina and 21:00–07:00 in
 * Colombia — and is meant to be narrowed once the main market is settled.
 */
function hourOr(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 && value <= 23 ? value : fallback;
}

function quietHoursUtc(): { from: number; to: number } {
  // Read by name, not through a computed key: a dynamic lookup hides the
  // variable from every tool that greps the codebase for its configuration.
  return {
    from: hourOr(process.env.FOLLOWUP_QUIET_FROM_UTC, 2),
    to: hourOr(process.env.FOLLOWUP_QUIET_TO_UTC, 12),
  };
}

export function isQuietHour(now: Date): boolean {
  const { from, to } = quietHoursUtc();
  const hour = now.getUTCHours();
  // A window that wraps past midnight is two ranges, not one.
  return from <= to ? hour >= from && hour < to : hour >= from || hour < to;
}

export interface FollowupCandidate {
  id: string;
  name: string;
  phone: string | null;
  packageId: DemoPackageId;
  completedAt: string | null;
  providerExpiresAt: string | null;
  marketingConsent: boolean;
}

export interface FollowupRepository {
  listFollowupCandidates(limit: number): Promise<FollowupCandidate[]>;
  claimFollowups(ids: string[], now: Date): Promise<string[]>;
  recordFollowup(id: string, status: "sent" | "failed"): Promise<void>;
}

export interface FollowupOutcome {
  considered: number;
  due: number;
  claimed: number;
  sent: number;
  failed: number;
  skipped: "quiet-hours" | "not-configured" | null;
}

/**
 * When the demo stopped working. A line carries its own expiry; an activation
 * code carries none, so it is estimated from the moment it was handed over.
 */
export function demoEndsAt(candidate: FollowupCandidate): Date | null {
  if (candidate.providerExpiresAt) {
    const expiry = new Date(candidate.providerExpiresAt);
    return Number.isNaN(expiry.getTime()) ? null : expiry;
  }
  if (!candidate.completedAt) return null;
  const handedOver = new Date(candidate.completedAt);
  if (Number.isNaN(handedOver.getTime())) return null;

  const minutes = ACTIVATION_GRACE_MINUTES + findPackage(candidate.packageId).minutes;
  return new Date(handedOver.getTime() + minutes * 60_000);
}

export function isDue(candidate: FollowupCandidate, now: Date): boolean {
  if (!candidate.marketingConsent || !candidate.phone) return false;
  const ended = demoEndsAt(candidate);
  if (!ended) return false;

  const sinceEnd = now.getTime() - ended.getTime();
  return (
    sinceEnd >= SETTLE_MINUTES * 60_000 &&
    sinceEnd <= MAX_AGE_HOURS * 3_600_000
  );
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface FollowupSender {
  sendDueFollowups(now: Date): Promise<FollowupOutcome>;
}

export function createFollowupSender(
  repository: FollowupRepository,
  whatsapp: WhatsAppClient = getWhatsAppClient(),
): FollowupSender {
  return {
    async sendDueFollowups(now) {
      const empty: FollowupOutcome = {
        considered: 0,
        due: 0,
        claimed: 0,
        sent: 0,
        failed: 0,
        skipped: null,
      };

      if (!whatsapp.isConfigured()) {
        return { ...empty, skipped: "not-configured" };
      }
      if (isQuietHour(now)) return { ...empty, skipped: "quiet-hours" };

      const candidates = await repository.listFollowupCandidates(200);
      const due = candidates.filter((candidate) => isDue(candidate, now));
      const batch = due.slice(0, BATCH_SIZE);
      if (batch.length === 0) {
        return { ...empty, considered: candidates.length, due: due.length };
      }

      // Claiming before sending is deliberate: a run that dies mid-flight
      // loses a follow-up rather than sending a second one later.
      const claimed = await repository.claimFollowups(
        batch.map((candidate) => candidate.id),
        now,
      );
      const claimedSet = new Set(claimed);

      let sent = 0;
      let failed = 0;
      let first = true;
      for (const candidate of batch) {
        if (!claimedSet.has(candidate.id) || !candidate.phone) continue;
        if (!first) await pause(SPACING_MS);
        first = false;

        let delivered = false;
        try {
          delivered = await whatsapp.sendText({
            phone: candidate.phone,
            message: buildFollowupMessage({
              name: candidate.name,
              packageId: candidate.packageId,
            }),
          });
        } catch {
          delivered = false;
        }

        if (delivered) sent += 1;
        else failed += 1;
        try {
          await repository.recordFollowup(
            candidate.id,
            delivered ? "sent" : "failed",
          );
        } catch {
          // The message already left; only the audit trail is behind.
        }
      }

      return {
        considered: candidates.length,
        due: due.length,
        claimed: claimed.length,
        sent,
        failed,
        skipped: null,
      };
    },
  };
}
