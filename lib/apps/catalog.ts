/**
 * The players a visitor can install before spending a minute of their demo.
 *
 * Both are the same APK whether it lands on a phone or on a television; what
 * changes is how it gets there. Where there is a browser the file downloads
 * directly. Where there is only a remote control, the Downloader app takes a
 * seven-digit code instead of a URL nobody wants to type with arrow keys.
 *
 * `bytes` is read off the server whenever an APK is replaced. It is here so
 * someone on mobile data sees the cost before tapping, not after.
 */
export interface PlayerApp {
  id: string;
  name: string;
  /** The model name the seller quotes on WhatsApp, so both agree. */
  model: string;
  apkUrl: string;
  downloaderCode: string;
  bytes: number;
  /** Exactly one is recommended, and it is the first in the list. */
  recommended: boolean;
}

export const PLAYER_APPS: readonly PlayerApp[] = [
  {
    id: "ibo26",
    name: "IBO 26",
    model: "IBO 26",
    apkUrl: "https://apps.nodo7.online/storage/apks/aZpzjaR5bcMtBfTpnzbZ.apk",
    downloaderCode: "4616237",
    bytes: 32_010_144,
    recommended: true,
  },
  {
    id: "v3play",
    name: "V3PLAY",
    model: "V3PLAY",
    apkUrl: "https://apps.nodo7.online/storage/apks/Azir0klo13FlVHzDCZcV.apk",
    downloaderCode: "3162777",
    bytes: 86_647_364,
    recommended: false,
  },
] as const;

export function recommendedApp(): PlayerApp {
  return PLAYER_APPS.find((app) => app.recommended) ?? PLAYER_APPS[0];
}

/** What a Downloader code resolves to, for anyone who has a browser instead. */
export function downloaderUrl(code: string): string {
  return `https://aftv.news/${code}`;
}

const MEGABYTE = 1_048_576;

export function formatBytes(bytes: number): string {
  const size = new Intl.NumberFormat("es", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(bytes / MEGABYTE);
  return `${size} MB`;
}

/**
 * Roku does not take an APK or a Downloader code: the app is installed from the
 * Roku Channel Store. On first open it shows a code on screen, and the visitor
 * sends that code to us over WhatsApp so we can activate it. The demo pass of
 * this portal is not involved.
 */
export const ROKU_APP = {
  /** The name the channel carries in the Roku store, exactly as searched. */
  storeName: "CLIENTAREA",
  /** wa.me wants the digits alone, with the country code and no plus sign. */
  whatsappPhone: "12815417014",
  whatsappDisplay: "+1 281 541 7014",
  whatsappMessage:
    "Hola, instalé CLIENTAREA en mi Roku y quiero activarla. El código que me aparece en pantalla es: ",
} as const;

export function rokuWhatsappUrl(): string {
  const text = encodeURIComponent(ROKU_APP.whatsappMessage);
  return `https://wa.me/${ROKU_APP.whatsappPhone}?text=${text}`;
}
