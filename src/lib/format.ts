import type { Category, Fuel, Transmission } from "./types";

const inr = new Intl.NumberFormat("en-IN");

/** ₹4,20,000 */
export function formatPrice(rupees: number) {
  return `₹${inr.format(rupees)}`;
}

/** ₹4.2 Lakh / ₹1.65 Cr — the way buyers say it out loud. */
export function formatPriceShort(rupees: number) {
  if (rupees >= 1_00_00_000) return `₹${trim(rupees / 1_00_00_000)} Cr`;
  if (rupees >= 1_00_000) return `₹${trim(rupees / 1_00_000)} Lakh`;
  return formatPrice(rupees);
}

function trim(n: number) {
  return n.toFixed(2).replace(/\.?0+$/, "");
}

export function formatKm(km: number) {
  return `${inr.format(km)} km`;
}

export function formatOwners(owners: number) {
  const suffix = owners === 1 ? "st" : owners === 2 ? "nd" : owners === 3 ? "rd" : "th";
  return `${owners}${suffix} owner`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export const fuelLabel: Record<Fuel, string> = {
  petrol: "Petrol",
  diesel: "Diesel",
  cng: "CNG",
  lpg: "LPG",
  electric: "Electric",
  hybrid: "Hybrid",
};

export const transmissionLabel: Record<Transmission, string> = {
  manual: "Manual",
  automatic: "Automatic",
};

/** Plain names with a hint, for buyers who don't know the trade terms. */
export const categoryLabel: Record<Category, { name: string; hint: string }> = {
  hatchback: { name: "Hatchback", hint: "Small car, no separate boot" },
  sedan: { name: "Sedan", hint: "Car with a boot at the back" },
  suv: { name: "SUV", hint: "Sits higher, rugged look" },
  muv: { name: "MUV", hint: "7-seater for families" },
};

/** Today's date (YYYY-MM-DD) in India, so follow-ups don't flip at 5:30 am. */
export function todayInIndia(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}
