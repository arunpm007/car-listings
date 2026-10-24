"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

export type SelectOption = { value: string; label: string; group?: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Shown when nothing is picked (value ""). */
  placeholder?: string;
  label?: string;
  /** Submits with the form under this name. */
  name?: string;
  required?: boolean;
  disabled?: boolean;
  /** pill: filter chips. dark: on the night hero. field: form inputs. */
  variant?: "pill" | "dark" | "field";
  className?: string;
};

const SEARCH_THRESHOLD = 12;

/**
 * A dropdown that matches the site instead of the browser's native one.
 * Keyboard: arrows move, Enter picks, Escape closes, typing jumps (or filters, on long lists).
 */
export function Select({
  value,
  onChange,
  options,
  placeholder = "Choose",
  label,
  name,
  required,
  disabled,
  variant = "field",
  className,
}: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  // On phones the options open as a bottom sheet: bigger targets, no tiny floating panel.
  const [sheet, setSheet] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const searchable = options.length > SEARCH_THRESHOLD;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);
  // "Set" means the user picked something other than the first, catch-all option.
  const isSet = variant === "pill" && value !== "" && value !== options[0]?.value;

  function openList() {
    if (disabled) return;
    setQuery("");
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    // The panel lives in a portal (so scrolling filter rows can't clip it), placed under the button.
    const rect = root.current!.getBoundingClientRect();
    const width = Math.max(rect.width, variant === "pill" ? 256 : 0);
    setPos({ top: rect.bottom + 8, left: Math.min(Math.max(8, rect.left), window.innerWidth - width - 8), width });
    setSheet(window.matchMedia("(max-width: 639px)").matches);
    setOpen(true);
  }

  function pick(option: SelectOption) {
    onChange(option.value);
    setOpen(false);
  }

  // Close on outside click, and when the page scrolls or resizes under the panel.
  useEffect(() => {
    if (!open) return;
    const inside = (t: EventTarget | null) => root.current?.contains(t as Node) || panel.current?.contains(t as Node);
    const onDown = (e: PointerEvent) => {
      if (!inside(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    if (sheet) {
      // The sheet covers the page, so hold the page still instead of closing on scroll.
      // (Resizing must not close it either: the phone keyboard resizes the window.)
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("pointerdown", onDown);
        document.body.style.overflow = prev;
      };
    }
    const onScroll = (e: Event) => {
      if (!inside(e.target)) setOpen(false);
    };
    const onResize = () => setOpen(false);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, sheet]);

  // Keep the highlighted option in view, and focus the search box on open.
  useEffect(() => {
    if (!open) return;
    // On phones, don't pop the keyboard up until they tap the search box.
    if (searchable && !sheet) searchRef.current?.focus();
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, searchable, sheet]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(shown.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      setActive(0);
    } else if (e.key === "End") {
      setActive(shown.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[active]) pick(shown[active]);
    } else if (e.key === "Tab") {
      setOpen(false);
    } else if (!searchable && e.key.length === 1) {
      // Type-ahead: jump to the next option starting with that letter.
      const letter = e.key.toLowerCase();
      const start = (active + 1) % shown.length;
      const order = [...shown.slice(start), ...shown.slice(0, start)];
      const hit = order.find((o) => o.label.toLowerCase().startsWith(letter));
      if (hit) setActive(shown.indexOf(hit));
    }
  }

  const trigger = {
    pill: clsx(
      "h-10 rounded-full border px-4 text-sm font-medium",
      isSet ? "border-accent bg-accent text-white shadow-md shadow-accent/25" : "border-line bg-surface hover:border-accent/50",
    ),
    dark: "h-12 w-full rounded-xl bg-white/[0.07] px-4 text-sm font-medium text-white ring-1 ring-white/10 hover:bg-white/[0.1]",
    field: clsx(
      "h-11 w-full rounded-xl border bg-background/50 px-3.5 text-sm",
      open ? "border-accent bg-surface ring-4 ring-accent/15" : "border-line hover:border-foreground/30",
    ),
  }[variant];

  return (
    <div ref={root} className={clsx("relative", variant !== "pill" && "w-full", className)} onKeyDown={onKeyDown}>
      <button
        type="button"
        id={`${id}-button`}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={label}
        className={clsx(
          "flex items-center justify-between gap-2 whitespace-nowrap text-left outline-none transition focus-visible:ring-4 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50",
          trigger,
        )}
      >
        <span className={clsx("truncate", !selected && variant === "field" && "text-muted")}>{selected?.label ?? placeholder}</span>
        <ChevronDown className={clsx("size-4 shrink-0 opacity-60 transition-transform duration-300", open && "rotate-180")} aria-hidden />
      </button>

      {/* Lets the form submit and validate it like a normal field. */}
      {(name || required) && (
        <input
          tabIndex={-1}
          aria-hidden
          name={name}
          value={value}
          required={required}
          onChange={() => {}}
          onFocus={() => document.getElementById(`${id}-button`)?.focus()}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0"
        />
      )}

      {open &&
        pos &&
        createPortal(
        <>
        {sheet && <div className="fade-in fixed inset-0 z-[59] bg-black/40" aria-hidden />}
        <div
          ref={panel}
          style={sheet ? undefined : { top: pos.top, left: pos.left, width: pos.width }}
          className={clsx(
            "fixed z-[60] overflow-hidden border border-line bg-surface text-foreground",
            sheet
              ? "sheet-up inset-x-0 bottom-0 flex max-h-[75dvh] flex-col rounded-t-3xl pb-[env(safe-area-inset-bottom)]"
              : "dropdown-in rounded-2xl shadow-[0_24px_60px_-20px_rgb(18_20_26/0.45)]",
          )}
        >
          {sheet && (
            <div className="flex items-center justify-between px-5 pb-2 pt-3">
              <span className="mx-auto mb-1 block h-1 w-10 rounded-full bg-black/15" aria-hidden />
            </div>
          )}
          {sheet && label && <p className="px-5 pb-2 font-display text-lg font-semibold">{label}</p>}
          {searchable && (
            <div className="flex items-center gap-2 border-b border-line px-3">
              <Search className="size-4 text-muted" aria-hidden />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                placeholder="Type to search"
                aria-label="Search options"
                className="h-11 w-full bg-transparent text-sm outline-none"
              />
            </div>
          )}
          <ul
            ref={list}
            id={`${id}-list`}
            role="listbox"
            aria-labelledby={`${id}-button`}
            className={clsx("overflow-y-auto p-1.5", sheet ? "flex-1 px-3 pb-4" : "max-h-72")}
          >
            {shown.length === 0 && <li className="px-3 py-2.5 text-sm text-muted">No matches</li>}
            {shown.map((o, i) => {
              const header = o.group && o.group !== shown[i - 1]?.group ? o.group : null;
              return (
                <li key={o.value} role="presentation">
                  {header && !query && (
                    <p className="px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted">{header}</p>
                  )}
                  <div
                    role="option"
                    data-index={i}
                    aria-selected={o.value === value}
                    onPointerEnter={() => setActive(i)}
                    onClick={() => pick(o)}
                    className={clsx(
                      "flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 transition-colors",
                      sheet ? "py-3.5 text-base" : "py-2.5 text-sm",
                      i === active ? "bg-accent/10 text-foreground" : "text-foreground/80",
                      o.value === value && "font-semibold text-foreground",
                    )}
                  >
                    <span className="truncate">{o.label}</span>
                    {o.value === value && <Check className="size-4 shrink-0 text-accent" aria-hidden />}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        </>,
        document.body,
      )}
    </div>
  );
}
