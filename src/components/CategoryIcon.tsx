import type { Category } from "@/lib/types";

// Side-profile silhouettes on a 64×28 grid, so buyers can see the shape, not just the word.
const PATHS: Record<Category, string> = {
  hatchback: "M6 20h-2v-5l6-2 8-6h18l8 7 10 1v5h-3M46 20H18",
  sedan: "M4 20H2v-4l10-3 9-6h17l9 6 13 1v6h-3M48 20H16",
  suv: "M4 20H2v-7l6-1 6-7h26l8 7 10 1v7h-3M48 20H16",
  muv: "M4 20H2v-7l4-1 5-6h33l9 6 9 1v7h-3M50 20H16",
};

export function CategoryIcon({ category, className }: { category: Category; className?: string }) {
  return (
    <svg viewBox="0 0 64 28" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={PATHS[category]} />
      <circle cx="12" cy="20" r="4" />
      <circle cx="52" cy="20" r="4" />
    </svg>
  );
}
