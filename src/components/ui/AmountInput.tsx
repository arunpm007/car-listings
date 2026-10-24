"use client";

import { useState } from "react";
import clsx from "clsx";
import { parseAmount, toUnit, type Unit } from "@/lib/amount";
import { formatKm, formatPrice, formatPriceShort } from "@/lib/format";

type Props = {
  /** The exact whole number as a string ("" when empty). */
  value: string;
  onChange: (exact: string) => void;
  kind: "price" | "km";
  label: string;
  /** Submits the exact number with the form under this name. */
  name?: string;
  required?: boolean;
  /** Unit the box starts in. Defaults to Lakh for prices and Exact for km. */
  defaultUnit?: Unit;
};

const UNIT_BUTTONS: { unit: Unit; label: string }[] = [
  { unit: "exact", label: "Exact" },
  { unit: "thousand", label: "K" },
  { unit: "lakh", label: "Lakh" },
];

/**
 * Number box for prices and km that takes shortcuts: pick Lakh and type 4.5, or type
 * "4.5 lakh", "45k" or the full figure. The unit buttons change how the typed number is read
 * (65 + K = 65,000); the line underneath shows exactly what gets saved.
 */
export function AmountInput({ value, onChange, kind, label, name, required, defaultUnit }: Props) {
  // Prices are usually talked about in lakhs; km as the full figure.
  const [unit, setUnit] = useState<Unit>(defaultUnit ?? (kind === "price" ? "lakh" : "exact"));
  const [text, setText] = useState(() => (value ? toUnit(Number(value), unit) : ""));

  const parsed = parseAmount(text, unit);
  const invalid = text.trim() !== "" && parsed === null;

  function update(nextText: string, nextUnit: Unit, input?: HTMLInputElement) {
    setText(nextText);
    const n = parseAmount(nextText, nextUnit);
    onChange(n === null ? "" : String(n));
    input?.setCustomValidity(nextText.trim() && n === null ? "Type a number like 4.5, 45k or 4,50,000" : "");
  }

  function switchUnit(next: Unit) {
    // The buttons say what unit the typed number is in: "65" then K means 65,000.
    setUnit(next);
    update(text, next);
  }

  // Show the unit beside the number, unless they typed one themselves ("4.5 lakh").
  const unitWord = /[a-z]/i.test(text) ? null : unit === "lakh" ? "lakh" : unit === "thousand" ? "thousand" : null;

  return (
    <div>
      <div
        className={clsx(
          "flex h-11 items-center rounded-xl border bg-background/50 transition focus-within:bg-surface focus-within:ring-4",
          invalid ? "border-red-400 focus-within:ring-red-200" : "border-line focus-within:border-accent focus-within:ring-accent/15",
        )}
      >
        {kind === "price" && <span className="pl-3.5 text-sm text-muted">₹</span>}
        <input
          aria-label={label}
          inputMode="decimal"
          autoComplete="off"
          required={required}
          value={text}
          onChange={(e) => update(e.target.value, unit, e.target)}
          placeholder={unit === "lakh" ? (kind === "price" ? "4.5" : "1.2") : unit === "thousand" ? "45" : kind === "price" ? "4,50,000" : "45,000"}
          className={clsx("h-full min-w-0 flex-1 bg-transparent text-sm outline-none", kind === "price" ? "pl-1.5" : "pl-3.5")}
        />
        {unitWord && <span className="pr-2 text-sm text-muted">{unitWord}</span>}
        <div role="group" aria-label={`${label} unit`} className="mr-1 flex shrink-0 rounded-lg bg-black/[0.05] p-0.5">
          {UNIT_BUTTONS.map((b) => (
            <button
              key={b.unit}
              type="button"
              aria-pressed={unit === b.unit}
              onClick={() => switchUnit(b.unit)}
              className={clsx(
                "rounded-md px-2 py-1 text-xs font-semibold transition",
                unit === b.unit ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground",
              )}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
      {name && <input type="hidden" name={name} value={parsed ?? ""} />}
      <p className={clsx("mt-1 min-h-4 text-xs", invalid ? "text-red-600" : "text-muted")}>
        {invalid
          ? "Type a number like 4.5, 45k or 4,50,000"
          : parsed !== null
            ? kind === "price"
              ? `= ${formatPrice(parsed)}${parsed >= 1_00_000 ? ` (${formatPriceShort(parsed)})` : ""}`
              : `= ${formatKm(parsed)}`
            : "You can also type 4.5 lakh or 45k"}
      </p>
    </div>
  );
}
