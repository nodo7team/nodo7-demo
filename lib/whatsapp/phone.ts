import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { COUNTRY_CODES, type Country } from "@/lib/whatsapp/countries";

export { COUNTRY_CODES };
export type { Country };

const MIN_DIGITS = 8;
const MAX_DIGITS = 15; // E.164

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function findCountry(iso: string): Country | undefined {
  return COUNTRY_CODES.find((country) => country.iso === iso);
}

/**
 * Argentine mobiles reach WhatsApp as 54 9 <area> <number>. libphonenumber
 * accepts the form without the nine as valid, and /send routes each form to a
 * different JID, so trusting it would deliver the credentials to a stranger.
 *
 * Locally the same line is dialled as 0<area> 15 <number>; neither the trunk
 * zero nor the 15 belong in the international form.
 */
function argentineMobile(national: string): string {
  const withoutFifteen = national.replace(/^(\d{2,4})15(\d{6,8})$/, "$1$2");
  return withoutFifteen.startsWith("9")
    ? withoutFifteen
    : `9${withoutFifteen}`;
}

/**
 * What the visitor typed, reduced to the national number libphonenumber should
 * see. A first parse does the heavy lifting — trunk zeros, separators, a
 * calling code they retyped — and whatever it cannot read falls back to the
 * bare digits.
 */
function nationalNumber(country: Country, typed: string): string | null {
  const parsed = parsePhoneNumberFromString(typed, country.iso);
  if (parsed) return String(parsed.nationalNumber);

  const digits = digitsOnly(typed).replace(/^0+/, "");
  if (!digits) return null;
  return digits.startsWith(country.dial) &&
    digits.length - country.dial.length >= MIN_DIGITS - 1
    ? digits.slice(country.dial.length)
    : digits;
}

/**
 * Turns a country and whatever the visitor typed into the digits WhatsApp
 * routes on, or null when that cannot be a reachable number.
 *
 * The country is identified by its ISO code, not by its calling code: every
 * Caribbean territory shares +1 with the United States, and 809 or 787 are
 * area codes inside the national number rather than part of the country's
 * code. Treating them as calling codes is what used to prepend them to numbers
 * that already carried their own.
 */
export function normalizePhone(
  countryIso: string,
  typed: string,
): string | null {
  const country = findCountry(countryIso);
  if (!country) return null;

  let national = nationalNumber(country, typed);
  if (!national) return null;
  if (country.iso === "AR") national = argentineMobile(national);

  const parsed = parsePhoneNumberFromString(`+${country.dial}${national}`);
  if (!parsed?.isValid()) return null;

  const digits = digitsOnly(parsed.number);
  return digits.length >= MIN_DIGITS && digits.length <= MAX_DIGITS
    ? digits
    : null;
}

/**
 * Which country the typed number really belongs to, or null when it agrees
 * with the one already selected. Lets the picker follow a Dominican who chose
 * Puerto Rico instead of arguing with them about it.
 */
export function detectCountry(
  countryIso: string,
  typed: string,
): CountryCode | null {
  const current = findCountry(countryIso);
  if (!current) return null;

  const parsed = parsePhoneNumberFromString(typed, current.iso);
  if (!parsed?.isValid()) return null;

  const found = parsed.country;
  if (!found || found === current.iso) return null;
  // Only move between territories that share a calling code, or when the
  // visitor pasted a full international number.
  return found;
}

/** Enough digits to recognise the number, not enough to publish it. */
export function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = digitsOnly(phone);
  if (digits.length < 6) return null;

  const parsed = parsePhoneNumberFromString(`+${digits}`);
  const dial = parsed?.countryCallingCode ?? digits.slice(0, 2);
  const rest = digits.slice(String(dial).length);
  return `+${dial} ${rest.slice(0, 3)}…${digits.slice(-4)}`;
}

/**
 * Readable but complete, for the operator's contact list. Falls back to the
 * bare digits rather than hiding a number the parser cannot place.
 */
export function formatPhone(phone: string): string {
  const digits = digitsOnly(phone);
  const parsed = parsePhoneNumberFromString(`+${digits}`);
  return parsed?.isValid() ? parsed.formatInternational() : `+${digits}`;
}

/**
 * Matches a country the way someone searches for one: by name, by ISO, by
 * calling code, or by the area code they think of as their country's code.
 */
export function matchesCountry(country: Country, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;

  const plain = needle
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .replace(/^\+/, "");
  const name = country.name
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase();

  if (name.includes(plain) || country.iso.toLowerCase() === plain) return true;
  if (!/^\d+$/.test(plain)) return false;
  return (
    country.dial.startsWith(plain) ||
    (country.areaCodes?.some((code) => code.startsWith(plain)) ?? false)
  );
}
