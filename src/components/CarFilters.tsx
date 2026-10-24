"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Loader2, SlidersHorizontal, X } from "lucide-react";
import clsx from "clsx";
import { CategoryIcon } from "@/components/CategoryIcon";
import { Select } from "@/components/ui/Select";
import { categoryLabel } from "@/lib/format";
import type { Category } from "@/lib/types";

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "km-asc", label: "Least driven" },
];

const BUDGETS = [
  { label: "Any budget", min: "", max: "" },
  { label: "Under ₹3 Lakh", min: "", max: "300000" },
  { label: "₹3 – 5 Lakh", min: "300000", max: "500000" },
  { label: "₹5 – 8 Lakh", min: "500000", max: "800000" },
  { label: "₹8 – 12 Lakh", min: "800000", max: "1200000" },
  { label: "₹12 – 20 Lakh", min: "1200000", max: "2000000" },
  { label: "Above ₹20 Lakh", min: "2000000", max: "" },
];

export type BrandCount = { slug: string; name: string; count: number };
export type CategoryCount = { key: Category; count: number };

type Props = { categories: CategoryCount[]; brands: BrandCount[]; total: number; count: number; readyCount: number };

/** Type and brand are the two ways to browse; budget and sort are the only other choices. */
export function CarFilters({ categories, brands, total, count, readyCount }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const brand = params.get("brand") ?? "";
  const type = params.get("type") ?? "";
  const ready = params.get("ready") === "1";

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    startTransition(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  }

  // Bring the picked chips into view on narrow screens, where the rows scroll sideways.
  const rows = useRef<HTMLDivElement>(null);
  useEffect(() => {
    rows.current?.querySelectorAll<HTMLElement>('[aria-pressed="true"]').forEach((el) => {
      const row = el.parentElement!;
      row.scrollTo({ left: el.offsetLeft - row.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
    });
  }, [brand, type]);

  const budget = BUDGETS.findIndex((b) => b.min === (params.get("minPrice") ?? "") && b.max === (params.get("maxPrice") ?? ""));
  const sort = params.get("sort") ?? "newest";
  const [sheetOpen, setSheetOpen] = useState(false);
  const activeCount = (brand ? 1 : 0) + (budget > 0 ? 1 : 0) + (sort !== "newest" ? 1 : 0);

  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  return (
    <div ref={rows} className={clsx("space-y-3 transition-opacity", pending && "opacity-60")}>
      {categories.length > 1 && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {categories.map((c) => (
            <button
              key={c.key}
              type="button"
              title={categoryLabel[c.key].hint}
              aria-pressed={type === c.key}
              onClick={() => update({ type: type === c.key ? "" : c.key })}
              className={clsx(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition md:h-11 md:px-3.5",
                type === c.key ? "border-accent bg-accent text-white shadow-md shadow-accent/25" : "border-line bg-surface hover:border-accent/50",
              )}
            >
              <CategoryIcon category={c.key} className="h-4 w-9" />
              {categoryLabel[c.key].name}
              <span className={clsx("rounded-full px-1.5 text-xs font-medium", type === c.key ? "bg-white/20" : "bg-black/5 text-muted")}>{c.count}</span>
            </button>
          ))}
        </div>
      )}
      {/* Phones: one row that opens the sheet. */}
      <div className="flex flex-wrap items-center gap-2 md:hidden">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={clsx(
            "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold",
            activeCount ? "border-foreground bg-foreground text-white" : "border-line bg-surface",
          )}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filters
          {activeCount > 0 && <span className="rounded-full bg-white/20 px-1.5 text-xs">{activeCount}</span>}
        </button>
        {(readyCount > 0 || ready) && (
          <ReadyChip active={ready} count={readyCount} onClick={() => update({ ready: ready ? "" : "1" })} />
        )}
        <span className="min-w-0 truncate text-sm text-muted">
          {[brands.find((b) => b.slug === brand)?.name, budget > 0 ? BUDGETS[budget].label : null].filter(Boolean).join(" · ")}
        </span>
        <span key={count} className="pop-in ml-auto whitespace-nowrap text-sm font-medium text-muted">
          {pending ? <Loader2 className="inline size-4 animate-spin" /> : count} {count === 1 ? "car" : "cars"}
        </span>
      </div>

      <div className="no-scrollbar -mx-4 hidden gap-2 overflow-x-auto px-4 md:flex">
        <Chip active={!brand} onClick={() => update({ brand: "" })} label="All brands" count={total} />
        {brands.map((b) => (
          <Chip key={b.slug} active={brand === b.slug} onClick={() => update({ brand: b.slug })} label={b.name} count={b.count} />
        ))}
      </div>
      <div className="hidden items-center gap-2 md:flex">
        {(readyCount > 0 || ready) && (
          <ReadyChip active={ready} count={readyCount} onClick={() => update({ ready: ready ? "" : "1" })} />
        )}
        <Select
          variant="pill"
          label="Budget"
          value={String(Math.max(budget, 0))}
          onChange={(v) => update({ minPrice: BUDGETS[+v].min, maxPrice: BUDGETS[+v].max })}
          options={BUDGETS.map((b, i) => ({ value: String(i), label: b.label }))}
        />
        <Select
          variant="pill"
          label="Sort"
          value={sort}
          onChange={(v) => update({ sort: v === "newest" ? "" : v })}
          options={SORTS}
        />
        <span key={count} className="pop-in ml-auto whitespace-nowrap text-sm font-medium text-muted">
          {pending ? <Loader2 className="inline size-4 animate-spin" /> : count} {count === 1 ? "car" : "cars"}
        </span>
      </div>

      {/* Portalled: the sticky bar's backdrop blur would otherwise trap a fixed sheet inside it. */}
      {sheetOpen &&
        createPortal(
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="fade-in absolute inset-0 bg-black/40" onClick={() => setSheetOpen(false)} />
          <div className="sheet-up absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-3xl bg-surface">
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <p className="font-display text-xl font-semibold">Filters</p>
              <button type="button" onClick={() => setSheetOpen(false)} aria-label="Close" className="rounded-full p-2 hover:bg-black/5">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto px-5 pb-4">
              <SheetGroup title="Brand">
                <Chip active={!brand} onClick={() => update({ brand: "" })} label="All brands" count={total} />
                {brands.map((b) => (
                  <Chip key={b.slug} active={brand === b.slug} onClick={() => update({ brand: b.slug })} label={b.name} count={b.count} />
                ))}
              </SheetGroup>
              <SheetGroup title="Budget">
                {BUDGETS.map((b, i) => (
                  <Pick key={b.label} active={Math.max(budget, 0) === i} onClick={() => update({ minPrice: b.min, maxPrice: b.max })}>
                    {b.label}
                  </Pick>
                ))}
              </SheetGroup>
              <SheetGroup title="Sort by">
                {SORTS.map((o) => (
                  <Pick key={o.value} active={sort === o.value} onClick={() => update({ sort: o.value === "newest" ? "" : o.value })}>
                    {o.label}
                  </Pick>
                ))}
              </SheetGroup>
            </div>
            <div className="flex gap-2 border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => update({ brand: "", minPrice: "", maxPrice: "", sort: "", ready: "" })}
                className="h-12 rounded-2xl border border-line px-5 font-semibold"
              >
                Clear
              </button>
              <button type="button" onClick={() => setSheetOpen(false)} className="h-12 flex-1 rounded-2xl bg-accent font-semibold text-white">
                {pending ? <Loader2 className="mx-auto size-5 animate-spin" /> : `Show ${count} ${count === 1 ? "car" : "cars"}`}
              </button>
            </div>
          </div>
        </div>,
          document.body,
        )}
    </div>
  );
}

/** "Ready to see now": only cars that are with us. */
function ReadyChip({ active, count, onClick }: { active: boolean; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition",
        active ? "border-emerald-600 bg-emerald-600 text-white" : "border-line bg-surface hover:border-emerald-500",
      )}
    >
      <span className={clsx("size-2 rounded-full", active ? "bg-white" : "bg-emerald-500")} />
      Ready to see now
      <span className={clsx("rounded-full px-1.5 text-xs font-medium", active ? "bg-white/20" : "bg-black/5 text-muted")}>{count}</span>
    </button>
  );
}

function SheetGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-muted">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function Pick({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "h-10 rounded-full border px-4 text-sm font-medium transition",
        active ? "border-accent bg-accent text-white" : "border-line bg-surface",
      )}
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition",
        active ? "border-foreground bg-foreground text-white" : "border-line bg-surface hover:border-foreground/40",
      )}
    >
      {label}
      <span className={clsx("rounded-full px-1.5 text-xs", active ? "bg-white/20" : "bg-black/5 text-muted")}>{count}</span>
    </button>
  );
}
