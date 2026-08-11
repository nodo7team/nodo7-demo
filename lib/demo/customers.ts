import type { DemoCustomerWithDemos } from "@/lib/demo/repository";
import type {
  DemoDeliveryStatus,
  DemoPackageId,
  DemoRequestStatus,
} from "@/lib/demo/types";
import { COUNTRY_CODES, findCountry } from "@/lib/whatsapp/phone";

/**
 * What the operator sees in the contact list. The phone is deliberately not
 * masked here: this page exists so that someone can open the chat and follow
 * the lead up, which a masked number makes impossible. Everywhere the demo
 * itself is audited the mask stays.
 */
export interface AdminCustomerView {
  id: string;
  name: string;
  phone: string;
  email: string;
  countryIso: string | null;
  countryName: string | null;
  marketingConsent: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  demoCount: number;
  deliveredCount: number;
  lastDemoAt: string | null;
  lastPackageId: DemoPackageId | null;
  lastRequestStatus: DemoRequestStatus | null;
  lastDeliveryStatus: DemoDeliveryStatus | null;
}

function millis(value: string): number {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function toAdminCustomerView(
  record: DemoCustomerWithDemos,
): AdminCustomerView {
  const ordered = [...record.demos].sort(
    (a, b) => millis(b.createdAt) - millis(a.createdAt),
  );
  const latest = ordered[0] ?? null;
  const country = record.countryIso ? findCountry(record.countryIso) : undefined;

  return {
    id: record.id,
    name: record.name,
    phone: record.phone,
    email: record.email,
    countryIso: record.countryIso,
    countryName: country?.name ?? null,
    marketingConsent: record.marketingConsent,
    firstSeenAt: record.firstSeenAt,
    lastSeenAt: record.lastSeenAt,
    demoCount: ordered.length,
    deliveredCount: ordered.filter((demo) => demo.status === "ok").length,
    lastDemoAt: latest?.createdAt ?? null,
    lastPackageId: latest?.packageId ?? null,
    lastRequestStatus: latest?.status ?? null,
    lastDeliveryStatus: latest?.deliveryStatus ?? null,
  };
}

/** wa.me wants the canonical digits, which is exactly how the phone is kept. */
export function whatsappLink(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

/**
 * Splits off the dial code and leaves the rest alone. Grouping the remainder
 * would have to guess a national format, and a wrong guess makes the operator
 * read a number that is not the one stored.
 */
export function displayPhone(
  phone: string,
  countryIso: string | null,
): string {
  const digits = phone.replace(/\D/g, "");
  const dial =
    (countryIso ? findCountry(countryIso)?.dial : undefined) ??
    COUNTRY_CODES.find((candidate) => digits.startsWith(candidate.dial))?.dial;
  if (!dial || !digits.startsWith(dial)) return `+${digits}`;
  return `+${dial} ${digits.slice(dial.length)}`;
}

/**
 * Matches on everything the operator might have in hand — a name, part of a
 * number, a domain — because they rarely remember which one they saved.
 */
export function matchesCustomer(
  customer: AdminCustomerView,
  search: string,
): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  const digits = needle.replace(/\D/g, "");
  return (
    customer.name.toLowerCase().includes(needle) ||
    customer.email.toLowerCase().includes(needle) ||
    (customer.countryName?.toLowerCase().includes(needle) ?? false) ||
    (digits.length > 0 && customer.phone.includes(digits))
  );
}
