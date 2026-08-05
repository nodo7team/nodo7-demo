import type { DemoPackageId } from "@/lib/demo/types";

/**
 * What each demo actually delivers. The two packages are not "more time" and
 * "less time": the long one drops live sports and the premium packs, and a
 * visitor who picks it expecting a match sees nothing. Every surface — the
 * picker, the result panel, the WhatsApp message — reads these same lists.
 */
export interface DemoPackage {
  id: DemoPackageId;
  /** Matches the name the provider reports back, so both agree. */
  name: string;
  badge: string;
  duration: string;
  tagline: string;
  includes: string[];
  excludes: string[];
}

export const DEMO_PACKAGES: readonly DemoPackage[] = [
  {
    id: 7,
    name: "1 hora FULL",
    badge: "TODO INCLUIDO",
    duration: "60 minutos",
    tagline: "La grilla entera, sin nada bloqueado.",
    includes: [
      "Fútbol en vivo, todas las ligas",
      "Eventos deportivos y PPV",
      "Packs premium completos",
      "Películas, series y canales 24/7",
    ],
    excludes: [],
  },
  {
    id: 6,
    name: "4 horas",
    badge: "SIN DEPORTES NI PREMIUM",
    duration: "240 minutos",
    tagline: "Más tiempo, pero con la grilla recortada.",
    includes: [
      "Canales generales de entretenimiento",
      "Películas y series a demanda",
    ],
    excludes: [
      "Sin fútbol en vivo",
      "Sin eventos deportivos ni PPV",
      "Sin packs premium",
    ],
  },
] as const;

export function findPackage(packageId: DemoPackageId): DemoPackage {
  return DEMO_PACKAGES.find((item) => item.id === packageId) ?? DEMO_PACKAGES[1];
}

export function packageName(packageId: DemoPackageId): string {
  return findPackage(packageId).name;
}

/** One line the visitor can act on: what this demo will and will not show. */
export function packageSummary(packageId: DemoPackageId): string {
  const item = findPackage(packageId);
  return item.excludes.length === 0
    ? "Incluye deportes en vivo, eventos y packs premium."
    : "No incluye fútbol en vivo, eventos deportivos ni packs premium.";
}
