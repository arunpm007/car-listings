import type { CarWithRelations } from "./types";

export function carTitle(car: Pick<CarWithRelations, "year" | "brand" | "model" | "variant">) {
  return [car.year, car.brand.name, car.model.name, car.variant].filter(Boolean).join(" ");
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** /cars/2018-maruti-suzuki-swift-vxi-12 — readable, and the trailing number is the id. */
export function carPath(car: Pick<CarWithRelations, "id" | "year" | "brand" | "model" | "variant">) {
  return `/cars/${slugify(carTitle(car))}-${car.id}`;
}

export function idFromSlug(slug: string): number | null {
  const match = /(?:^|-)(\d+)$/.exec(slug);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
