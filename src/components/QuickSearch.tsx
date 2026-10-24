"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { Select } from "@/components/ui/Select";
import type { Brand } from "@/lib/types";

const BUDGETS = [
  { label: "Any budget", min: "", max: "" },
  { label: "Under ₹3 Lakh", min: "", max: "300000" },
  { label: "₹3 – 5 Lakh", min: "300000", max: "500000" },
  { label: "₹5 – 8 Lakh", min: "500000", max: "800000" },
  { label: "₹8 – 12 Lakh", min: "800000", max: "1200000" },
  { label: "Above ₹12 Lakh", min: "1200000", max: "" },
];

/** Brand + budget search in the hero. Hands off to /cars with the filters in the URL. */
export function QuickSearch({ brands }: { brands: Brand[] }) {
  const router = useRouter();
  const [brand, setBrand] = useState("");
  const [budget, setBudget] = useState("0");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (brand) params.set("brand", brand);
    const b = BUDGETS[Number(budget)];
    if (b.min) params.set("minPrice", b.min);
    if (b.max) params.set("maxPrice", b.max);
    startTransition(() => router.push(`/cars${params.size ? `?${params}` : ""}`));
  }

  return (
    <form onSubmit={submit} className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 backdrop-blur-xl sm:grid-cols-[1fr_1fr_auto]">
      <Select
        variant="dark"
        label="Brand"
        value={brand}
        onChange={setBrand}
        options={[{ value: "", label: "Any brand" }, ...brands.map((b) => ({ value: b.slug, label: b.name }))]}
      />
      <Select
        variant="dark"
        label="Budget"
        value={budget}
        onChange={setBudget}
        options={BUDGETS.map((b, i) => ({ value: String(i), label: b.label }))}
      />
      <button
        type="submit"
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 font-semibold text-white transition hover:bg-accent-deep active:scale-[0.98]"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" aria-hidden />}
        Find cars
      </button>
    </form>
  );
}
