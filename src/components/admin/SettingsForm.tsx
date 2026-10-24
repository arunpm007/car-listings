"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, MessageCircle, Phone } from "lucide-react";
import clsx from "clsx";
import { saveSettings, type SettingsInput } from "@/app/admin/actions";
import type { Site } from "@/config/site";
import { telHref, whatsappHref } from "@/lib/contact";
import { normalizeIndianPhone, waNumber } from "@/lib/phone";

export function SettingsForm({ site, onSaved, onCancel }: { site: Site; onSaved: () => void; onCancel: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // WhatsApp is usually the same number as the phone; keep it in step unless they untick this.
  const [sameNumber, setSameNumber] = useState(waNumber(normalizeIndianPhone(site.phone) ?? site.phone) === site.whatsapp);
  const [v, setV] = useState<SettingsInput>({
    name: site.name,
    tagline: site.tagline,
    city: site.city,
    phone: site.phone,
    whatsapp: site.whatsapp.startsWith("91") && site.whatsapp.length === 12 ? `+91 ${site.whatsapp.slice(2)}` : site.whatsapp,
    email: site.email ?? "",
    address: site.address ?? "",
    map_url: site.mapUrl ?? "",
    hours: site.hours,
    show_car_area: site.showCarArea,
  });
  const set = <K extends keyof SettingsInput>(key: K, value: SettingsInput[K]) => {
    setV((prev) => ({ ...prev, [key]: value }));
  };

  // What the website's buttons will actually dial and open.
  const phoneOut = normalizeIndianPhone(v.phone) ?? v.phone;
  const waSource = sameNumber ? v.phone : v.whatsapp;
  const waOut = (() => {
    const indian = normalizeIndianPhone(waSource);
    return indian ? waNumber(indian) : waSource.replace(/\D/g, "");
  })();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveSettings({ ...v, whatsapp: sameNumber ? v.phone : v.whatsapp });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      onSaved();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Section title="Business" hint="Shown in the header, footer and page titles.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Business name" required>
            <input className={input} value={v.name} onChange={(e) => set("name", e.target.value)} required maxLength={60} />
          </Field>
          <Field label="Area you serve" hint='Shown as "cars available in …"'>
            <input className={input} value={v.city} onChange={(e) => set("city", e.target.value)} maxLength={60} placeholder="Coorg" />
          </Field>
        </div>
        <Field label="Tagline" hint="One line under the name in the footer and search results" className="mt-4">
          <input className={input} value={v.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={140} />
        </Field>
      </Section>

      <Section title="Contact" hint="Every Call and WhatsApp button on the website uses these.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Phone number" required>
            <input className={input} type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} required placeholder="98765 43210" />
          </Field>
          <Field label="WhatsApp number">
            <input
              className={clsx(input, sameNumber && "opacity-50")}
              type="tel"
              value={sameNumber ? v.phone : v.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
              disabled={sameNumber}
              placeholder="98765 43210"
            />
          </Field>
        </div>
        <label className="mt-3 inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sameNumber}
            onChange={(e) => {
              setSameNumber(e.target.checked);
              if (!e.target.checked) set("whatsapp", v.phone);
            }}
            className="size-4 accent-[var(--accent)]"
          />
          WhatsApp is on the same number
        </label>

        <div className="mt-4 flex flex-wrap gap-2 rounded-2xl bg-background p-3 text-sm">
          <span className="text-muted">Test the buttons:</span>
          <a href={telHref(phoneOut)} className="inline-flex items-center gap-1.5 font-semibold text-foreground hover:text-accent">
            <Phone className="size-4" aria-hidden /> {phoneOut || "—"}
          </a>
          <a
            href={whatsappHref("Test message from the website settings", waOut)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-whatsapp hover:underline"
          >
            <MessageCircle className="size-4" aria-hidden /> wa.me/{waOut || "—"}
          </a>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Email" hint="Optional">
            <input className={input} type="email" value={v.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Hours">
            <input className={input} value={v.hours} onChange={(e) => set("hours", e.target.value)} maxLength={80} placeholder="Mon–Sat, 9 am – 7 pm" />
          </Field>
        </div>
      </Section>

      <Section title="Location" hint="Leave the address empty while there's no shop; it stays hidden everywhere.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Shop address">
            <input className={input} value={v.address} onChange={(e) => set("address", e.target.value)} maxLength={200} />
          </Field>
          <Field label="Google Maps link" hint="Starts with https://">
            <input className={input} type="url" value={v.map_url} onChange={(e) => set("map_url", e.target.value)} />
          </Field>
        </div>
        <label className="mt-4 inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={v.show_car_area}
            onChange={(e) => set("show_car_area", e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          Show the area each car is in (e.g. Kushalnagar) on the website
        </label>
      </Section>

      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-accent px-6 font-semibold text-accent-ink disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Save settings
        </button>
        <button type="button" onClick={onCancel} disabled={pending} className="h-11 rounded-lg px-4 font-semibold text-muted hover:text-foreground">
          Cancel
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </form>
  );
}

const input = "h-11 w-full rounded-xl border border-line bg-background/50 px-3.5 text-sm outline-none transition focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15 disabled:cursor-not-allowed";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, required, className, children }: { label: string; hint?: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <label className={clsx("block", className)}>
      <span className="text-sm font-medium">
        {label}
        {required && <span className="text-accent"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
