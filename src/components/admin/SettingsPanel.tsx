"use client";

import { useState } from "react";
import { CheckCircle2, Pencil } from "lucide-react";
import type { Site } from "@/config/site";
import { prettyPhone } from "@/lib/phone";
import { SettingsForm } from "./SettingsForm";

/** Shows the saved settings; Edit swaps in the form, and saving or cancelling comes back here. */
export function SettingsPanel({ site }: { site: Site }) {
  const [editing, setEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  if (editing) {
    return (
      <SettingsForm
        site={site}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          setJustSaved(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    );
  }

  const rows: [string, string | null][] = [
    ["Business name", site.name],
    ["Area you serve", site.city || null],
    ["Tagline", site.tagline || null],
    ["Phone", site.phone],
    ["WhatsApp", site.whatsapp ? prettyPhone(`+${site.whatsapp}`) : null],
    ["Email", site.email],
    ["Hours", site.hours || null],
    ["Shop address", site.address],
    ["Google Maps link", site.mapUrl],
    ["Show each car's area", site.showCarArea ? "Yes" : "No"],
  ];

  return (
    <div className="space-y-4">
      {justSaved && (
        <p className="pop-in flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          <CheckCircle2 className="size-4" aria-hidden /> Saved. The website shows these details now.
        </p>
      )}
      <section className="rounded-xl border border-line bg-surface">
        <dl className="divide-y divide-line">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[12rem_1fr] sm:gap-4">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className={value ? "break-words text-sm font-medium" : "text-sm text-muted/70"}>{value ?? "Not set"}</dd>
            </div>
          ))}
        </dl>
      </section>
      <button
        type="button"
        onClick={() => {
          setJustSaved(false);
          setEditing(true);
        }}
        className="inline-flex h-11 items-center gap-2 rounded-lg bg-accent px-6 font-semibold text-accent-ink"
      >
        <Pencil className="size-4" aria-hidden /> Edit settings
      </button>
    </div>
  );
}
