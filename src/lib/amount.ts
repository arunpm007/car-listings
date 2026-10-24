// Turns what people type for prices and km into an exact whole number.
// "450000", "4,50,000", "4.5 lakh", "4.5L", "45k", "1.2 cr" all work; a bare number can
// also be scaled by the unit picked next to the box (e.g. "4.5" with Lakh selected).

export const UNITS = {
  exact: 1,
  thousand: 1_000,
  lakh: 1_00_000,
  crore: 1_00_00_000,
} as const;

export type Unit = keyof typeof UNITS;

const SUFFIX: Record<string, Unit> = {
  k: "thousand",
  thousand: "thousand",
  l: "lakh",
  lac: "lakh",
  lacs: "lakh",
  lakh: "lakh",
  lakhs: "lakh",
  cr: "crore",
  crore: "crore",
  crores: "crore",
};

/** Whole number for the text, or null if it isn't one. An empty box is null too. */
export function parseAmount(text: string, unit: Unit = "exact"): number | null {
  const cleaned = text.trim().toLowerCase().replace(/,/g, "").replace(/^₹\s*/, "");
  if (!cleaned) return null;
  const match = /^(\d+(?:\.\d+)?|\.\d+)\s*([a-z]+)?$/.exec(cleaned);
  if (!match) return null;
  const [, num, suffix] = match;
  const scale = suffix ? SUFFIX[suffix] : unit;
  if (!scale) return null;
  const value = Math.round(Number(num) * UNITS[scale]);
  return Number.isSafeInteger(value) ? value : null;
}

/** Shows an exact number back in the unit the person is typing in, without trailing zeros. */
export function toUnit(value: number, unit: Unit) {
  return String(Number((value / UNITS[unit]).toFixed(5)));
}

/** Model years for the year picker, newest first. */
export function yearOptions(oldest = 1980) {
  const newest = new Date().getFullYear();
  return Array.from({ length: newest - oldest + 1 }, (_, i) => String(newest - i)).map((y) => ({ value: y, label: y }));
}
