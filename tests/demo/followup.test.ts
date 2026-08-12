// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFollowupSender,
  demoEndsAt,
  isDue,
  isQuietHour,
  type FollowupCandidate,
  type FollowupRepository,
} from "@/lib/demo/followup";
import type { WhatsAppClient } from "@/lib/whatsapp/client";

const NOW = new Date("2026-08-12T15:00:00.000Z");

function candidate(
  overrides: Partial<FollowupCandidate> = {},
): FollowupCandidate {
  return {
    id: "request-1",
    name: "María López",
    phone: "13465551234",
    packageId: 7,
    completedAt: "2026-08-12T13:00:00.000Z",
    providerExpiresAt: "2026-08-12T14:00:00.000Z",
    marketingConsent: true,
    ...overrides,
  };
}

class RepositoryDouble implements FollowupRepository {
  candidates: FollowupCandidate[] = [];
  claimed: string[] = [];
  recorded: Array<{ id: string; status: string }> = [];
  /** Simulates another run that already took these rows. */
  alreadyTaken = new Set<string>();

  async listFollowupCandidates(): Promise<FollowupCandidate[]> {
    return this.candidates;
  }

  async claimFollowups(ids: string[]): Promise<string[]> {
    const winners = ids.filter((id) => !this.alreadyTaken.has(id));
    this.claimed.push(...winners);
    for (const id of winners) this.alreadyTaken.add(id);
    return winners;
  }

  async recordFollowup(id: string, status: "sent" | "failed"): Promise<void> {
    this.recorded.push({ id, status });
  }
}

function whatsappDouble(overrides: Partial<WhatsAppClient> = {}): WhatsAppClient {
  return {
    isConfigured: () => true,
    numberExists: vi.fn().mockResolvedValue(true),
    sendText: vi.fn().mockResolvedValue(true),
    connectionState: vi.fn().mockResolvedValue("connected" as const),
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  delete process.env.FOLLOWUP_QUIET_FROM_UTC;
  delete process.env.FOLLOWUP_QUIET_TO_UTC;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("when a demo ended", () => {
  it("trusts the expiry the provider gave for a line", () => {
    expect(demoEndsAt(candidate())?.toISOString()).toBe(
      "2026-08-12T14:00:00.000Z",
    );
  });

  /**
   * An activation code starts when it is redeemed and the panel never reports
   * that, so the end is estimated: an hour of grace plus the package.
   */
  it("estimates the end of an activation code from when it was handed over", () => {
    expect(
      demoEndsAt(
        candidate({ providerExpiresAt: null, packageId: 7 }),
      )?.toISOString(),
    ).toBe("2026-08-12T15:00:00.000Z");

    expect(
      demoEndsAt(
        candidate({ providerExpiresAt: null, packageId: 6 }),
      )?.toISOString(),
    ).toBe("2026-08-12T18:00:00.000Z");
  });

  it("gives up rather than guessing when there is no date at all", () => {
    expect(
      demoEndsAt(candidate({ providerExpiresAt: null, completedAt: null })),
    ).toBeNull();
  });
});

describe("who is due", () => {
  it("waits for the picture to really be gone", () => {
    // Ended fifty-nine minutes ago: well past the settling window.
    expect(isDue(candidate(), NOW)).toBe(true);
    // Ends in a minute; the visitor is still watching.
    expect(
      isDue(candidate({ providerExpiresAt: "2026-08-12T15:01:00.000Z" }), NOW),
    ).toBe(false);
  });

  it("never wakes someone whose demo died days ago", () => {
    // A run catching up after an outage must not message last week.
    expect(
      isDue(candidate({ providerExpiresAt: "2026-08-05T14:00:00.000Z" }), NOW),
    ).toBe(false);
  });

  it("respects the consent the visitor gave", () => {
    expect(isDue(candidate({ marketingConsent: false }), NOW)).toBe(false);
  });

  it("skips a request with no number left to write to", () => {
    expect(isDue(candidate({ phone: null }), NOW)).toBe(false);
  });
});

describe("quiet hours", () => {
  it("holds messages through the night by default", () => {
    expect(isQuietHour(new Date("2026-08-12T05:00:00.000Z"))).toBe(true);
    expect(isQuietHour(new Date("2026-08-12T15:00:00.000Z"))).toBe(false);
  });

  it("handles a window that wraps past midnight", () => {
    process.env.FOLLOWUP_QUIET_FROM_UTC = "22";
    process.env.FOLLOWUP_QUIET_TO_UTC = "8";
    expect(isQuietHour(new Date("2026-08-12T23:00:00.000Z"))).toBe(true);
    expect(isQuietHour(new Date("2026-08-12T03:00:00.000Z"))).toBe(true);
    expect(isQuietHour(new Date("2026-08-12T12:00:00.000Z"))).toBe(false);
  });
});

describe("sending the follow-ups", () => {
  let repository: RepositoryDouble;

  beforeEach(() => {
    repository = new RepositoryDouble();
  });

  async function run(whatsapp: WhatsAppClient, now = NOW) {
    const sender = createFollowupSender(repository, whatsapp);
    const running = sender.sendDueFollowups(now);
    await vi.runAllTimersAsync();
    return running;
  }

  it("writes to everyone who is due and records what happened", async () => {
    repository.candidates = [
      candidate({ id: "a" }),
      candidate({ id: "b", packageId: 6 }),
    ];
    const whatsapp = whatsappDouble();

    const outcome = await run(whatsapp);

    expect(outcome).toMatchObject({ due: 2, claimed: 2, sent: 2, failed: 0 });
    expect(whatsapp.sendText).toHaveBeenCalledTimes(2);
    expect(repository.recorded).toEqual([
      { id: "a", status: "sent" },
      { id: "b", status: "sent" },
    ]);
  });

  it("asks about the football only of the demo that had it", async () => {
    repository.candidates = [
      candidate({ id: "a", packageId: 7 }),
      candidate({ id: "b", packageId: 6 }),
    ];
    const whatsapp = whatsappDouble();
    await run(whatsapp);

    const calls = (whatsapp.sendText as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0].message).toMatch(/grilla completa/i);
    expect(calls[1][0].message).toMatch(/grilla recortada/i);
    expect(calls[1][0].message).not.toMatch(/tuviste la grilla completa/i);
  });

  it("greets people by their first name only", async () => {
    repository.candidates = [candidate({ name: "María López Fernández" })];
    const whatsapp = whatsappDouble();
    await run(whatsapp);

    const [[input]] = (whatsapp.sendText as ReturnType<typeof vi.fn>).mock.calls;
    expect(input.message).toContain("Hola María");
    expect(input.message).not.toContain("Fernández");
  });

  it("stays silent during the night", async () => {
    repository.candidates = [candidate()];
    const whatsapp = whatsappDouble();

    const outcome = await run(whatsapp, new Date("2026-08-12T05:00:00.000Z"));

    expect(outcome.skipped).toBe("quiet-hours");
    expect(whatsapp.sendText).not.toHaveBeenCalled();
  });

  it("does nothing at all when WhatsApp is switched off", async () => {
    repository.candidates = [candidate()];
    const whatsapp = whatsappDouble({ isConfigured: () => false });

    const outcome = await run(whatsapp);

    expect(outcome.skipped).toBe("not-configured");
    expect(repository.claimed).toEqual([]);
  });

  /**
   * Two overlapping runs must not both write to the same person. The claim
   * decides the winner, and the loser sends nothing.
   */
  it("never writes twice to a row another run already claimed", async () => {
    repository.candidates = [candidate({ id: "a" }), candidate({ id: "b" })];
    repository.alreadyTaken.add("a");
    const whatsapp = whatsappDouble();

    const outcome = await run(whatsapp);

    expect(outcome.claimed).toBe(1);
    expect(whatsapp.sendText).toHaveBeenCalledTimes(1);
    expect(repository.recorded).toEqual([{ id: "b", status: "sent" }]);
  });

  it("records a refusal instead of pretending it went out", async () => {
    repository.candidates = [candidate()];
    const whatsapp = whatsappDouble({
      sendText: vi.fn().mockResolvedValue(false),
    });

    const outcome = await run(whatsapp);

    expect(outcome).toMatchObject({ sent: 0, failed: 1 });
    expect(repository.recorded).toEqual([
      { id: "request-1", status: "failed" },
    ]);
  });

  it("survives the client throwing mid-run", async () => {
    repository.candidates = [candidate({ id: "a" }), candidate({ id: "b" })];
    const sendText = vi
      .fn()
      .mockRejectedValueOnce(new Error("session dropped"))
      .mockResolvedValueOnce(true);
    const whatsapp = whatsappDouble({ sendText });

    const outcome = await run(whatsapp);

    expect(outcome).toMatchObject({ sent: 1, failed: 1 });
  });

  it("caps a run so a backlog cannot become a burst", async () => {
    // waclient drives WhatsApp Web; a flood is what gets a number banned.
    repository.candidates = Array.from({ length: 40 }, (_, index) =>
      candidate({ id: `req-${index}` }),
    );
    const whatsapp = whatsappDouble();

    const outcome = await run(whatsapp);

    expect(outcome.due).toBe(40);
    expect(outcome.claimed).toBe(15);
    expect(whatsapp.sendText).toHaveBeenCalledTimes(15);
  });

  it("leaves nobody claimed when nobody is due", async () => {
    repository.candidates = [candidate({ marketingConsent: false })];
    const whatsapp = whatsappDouble();

    const outcome = await run(whatsapp);

    expect(outcome).toMatchObject({ considered: 1, due: 0, claimed: 0 });
    expect(repository.claimed).toEqual([]);
  });
});
