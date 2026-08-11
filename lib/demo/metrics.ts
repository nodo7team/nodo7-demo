import type { AdminCodeView } from "@/lib/demo/admin-client";

/**
 * Read off the codes the console already loaded, so the summary costs no extra
 * query and can never disagree with the table below it.
 */
export interface AdminMetrics {
  issued: number;
  activated: number;
  delivered: number;
  /** Demos that reached the visitor's WhatsApp, as far as the panel accepted. */
  sent: number;
  /** Delivered demos over issued passes, 0 when nothing was issued yet. */
  conversion: number;
  fullHour: number;
  longDemo: number;
}

export function summarizeCodes(codes: AdminCodeView[]): AdminMetrics {
  let activated = 0;
  let delivered = 0;
  let sent = 0;
  let fullHour = 0;
  let longDemo = 0;

  for (const code of codes) {
    if (code.activatedAt) activated += 1;
    const request = code.request;
    if (!request || request.status !== "ok") continue;
    delivered += 1;
    if (request.deliveryStatus === "sent") sent += 1;
    if (request.packageId === 7) fullHour += 1;
    else longDemo += 1;
  }

  return {
    issued: codes.length,
    activated,
    delivered,
    sent,
    conversion: codes.length === 0 ? 0 : delivered / codes.length,
    fullHour,
    longDemo,
  };
}
