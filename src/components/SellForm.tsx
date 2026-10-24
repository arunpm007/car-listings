"use client";

import Link from "next/link";
import { CheckCircle2, ImagePlus, Loader2, Lock, MessageCircle, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { finishSellRequest, startSellRequest } from "@/app/(site)/sell/actions";
import { whatsappHref } from "@/lib/contact";
import { useSite } from "./SiteProvider";
import { fuelLabel, transmissionLabel } from "@/lib/format";
import { resizePhoto } from "@/lib/photo-resize";
import { AmountInput } from "@/components/ui/AmountInput";
import { Select } from "@/components/ui/Select";
import { yearOptions } from "@/lib/amount";
import { createClient } from "@/lib/supabase/client";
import { REQUEST_PHOTO_BUCKET } from "@/lib/supabase/env";
import { FUELS, TRANSMISSIONS, type Brand, type Model } from "@/lib/types";

const OTHER = "__other__";
const MAX_PHOTOS = 10;

type Picked = { key: string; file: File; preview: string };

export function SellForm({ brands, models }: { brands: Brand[]; models: Model[] }) {
  const site = useSite();
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [fuel, setFuel] = useState("");
  const [year, setYear] = useState("");
  const [km, setKm] = useState("");
  const [price, setPrice] = useState("");
  const [transmission, setTransmission] = useState("");
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [stage, setStage] = useState<"idle" | "sending" | "uploading">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ code: string; summary: string; failed: number } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const brandModels = useMemo(() => models.filter((m) => String(m.brand_id) === brandId), [models, brandId]);
  const otherBrand = brandId === OTHER;
  const otherModel = otherBrand || modelId === OTHER;

  function addFiles(list: FileList | null) {
    if (!list) return;
    const room = MAX_PHOTOS - photos.length;
    const next = [...list].slice(0, room).map((file) => ({ key: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }));
    setPhotos((prev) => [...prev, ...next]);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "");

    setStage("sending");
    const result = await startSellRequest({
      seller_name: value("name"),
      seller_phone: value("phone"),
      brand_id: otherBrand || !brandId ? null : Number(brandId),
      brand_text: otherBrand ? value("brand_text") : null,
      model_id: otherModel || !modelId ? null : Number(modelId),
      model_text: otherModel ? value("model_text") : null,
      variant: value("variant"),
      year: value("year"),
      fuel: (value("fuel") || null) as (typeof FUELS)[number] | null,
      transmission: (value("transmission") || null) as (typeof TRANSMISSIONS)[number] | null,
      km_driven: value("km"),
      expected_price: value("price"),
      location: value("location"),
      notes: value("notes"),
      photo_count: photos.length,
      website: value("website"),
    });
    if (!result.ok) {
      setError(result.error);
      setStage("idle");
      return;
    }

    // Photos go straight to storage using the one-time links. A failed photo doesn't lose the request.
    setStage("uploading");
    const supabase = createClient();
    // Placeholder sizes keep the array dense; the server only uses sizes for files it finds.
    const dims = result.uploads.map(() => ({ width: 1, height: 1 }));
    let failed = 0;
    for (const upload of result.uploads) {
      try {
        const resized = await resizePhoto(photos[upload.index].file);
        const bucket = supabase.storage.from(REQUEST_PHOTO_BUCKET);
        const [full, thumb] = await Promise.all([
          bucket.uploadToSignedUrl(upload.fullPath, upload.fullToken, resized.full, { contentType: "image/jpeg" }),
          bucket.uploadToSignedUrl(upload.thumbPath, upload.thumbToken, resized.thumb, { contentType: "image/jpeg" }),
        ]);
        if (full.error || thumb.error) throw full.error ?? thumb.error;
        dims[upload.index] = { width: resized.width, height: resized.height };
      } catch {
        failed++;
      }
      setProgress((p) => p + 1);
    }
    failed += photos.length - result.uploads.length;
    if (result.uploads.length) await finishSellRequest(result.token, dims);

    const brandName = otherBrand ? value("brand_text") : brands.find((b) => String(b.id) === brandId)?.name;
    const modelName = otherModel ? value("model_text") : models.find((m) => String(m.id) === modelId)?.name;
    setDone({
      code: result.code,
      summary: [value("year"), brandName, modelName, value("variant")].filter(Boolean).join(" "),
      failed,
    });
  }

  if (done) {
    return (
      <div className="pop-in rounded-3xl border border-line bg-surface p-8 text-center">
        <CheckCircle2 className="mx-auto size-14 text-emerald-600" aria-hidden />
        <h2 className="mt-3 text-xl font-bold">Thanks — we have your car</h2>
        <p className="mt-1 text-muted">
          Your reference is <span className="font-mono font-semibold text-foreground">{done.code}</span>. We will call you to
          arrange a visit.
        </p>
        {done.failed > 0 && (
          <p className="mt-3 text-sm text-amber-800">
            {done.failed} {done.failed === 1 ? "photo" : "photos"} didn&apos;t upload. You can send them on WhatsApp instead.
          </p>
        )}
        <a
          href={whatsappHref(`Hi, I just sent ${done.code} (${done.summary}) from your website.`, site.whatsapp)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-whatsapp px-5 font-semibold text-white"
        >
          <MessageCircle className="size-4" aria-hidden /> Let us know on WhatsApp
        </a>
      </div>
    );
  }

  const busy = stage !== "idle";

  return (
    <form onSubmit={submit} className="space-y-6">
      <Section title="Your car">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Brand" required>
            <Select
              label="Brand"
              required
              value={brandId}
              onChange={(v) => (setBrandId(v), setModelId(""))}
              placeholder="Choose brand"
              options={[...brands.map((b) => ({ value: String(b.id), label: b.name })), { value: OTHER, label: "Other" }]}
            />
          </Field>
          {otherBrand && (
            <Field label="Which brand?" required>
              <input name="brand_text" className={input} required maxLength={60} />
            </Field>
          )}
          {!otherBrand && (
            <Field label="Model" required>
              <Select
                label="Model"
                required
                disabled={!brandId}
                value={modelId}
                onChange={setModelId}
                placeholder={brandId ? "Choose model" : "Choose a brand first"}
                options={[...brandModels.map((m) => ({ value: String(m.id), label: m.name })), { value: OTHER, label: "Other" }]}
              />
            </Field>
          )}
          {otherModel && (
            <Field label="Which model?" required>
              <input name="model_text" className={input} required maxLength={60} />
            </Field>
          )}
          <Field label="Variant" hint="If you know it, e.g. VXI, SX">
            <input name="variant" className={input} maxLength={60} />
          </Field>
          <Field label="Year" required>
            <Select label="Year" name="year" required value={year} onChange={setYear} placeholder="Choose year" options={yearOptions()} />
          </Field>
          <Field label="Km driven" required>
            <AmountInput kind="km" label="Km driven" name="km" required value={km} onChange={setKm} />
          </Field>
          <Field label="Fuel">
            <Select
              label="Fuel"
              name="fuel"
              value={fuel}
              onChange={setFuel}
              placeholder="Not sure"
              options={FUELS.map((f) => ({ value: f, label: fuelLabel[f] }))}
            />
          </Field>
          <Field label="Gearbox">
            <Select
              label="Gearbox"
              name="transmission"
              value={transmission}
              onChange={setTransmission}
              placeholder="Not sure"
              options={TRANSMISSIONS.map((t) => ({ value: t, label: transmissionLabel[t] }))}
            />
          </Field>
          <Field label="Price you expect" hint="A rough number is fine">
            <AmountInput kind="price" label="Price you expect" name="price" value={price} onChange={setPrice} />
          </Field>
          <Field label="Where is the car?" hint="Area or town">
            <input name="location" className={input} maxLength={80} />
          </Field>
        </div>
        <Field label="Anything else?" hint="Service history, accidents, loan on the car…" className="mt-4">
          <textarea name="notes" className={clsx(input, "h-24 py-2")} maxLength={1000} />
        </Field>
      </Section>

      <Section title="Photos" hint={`Up to ${MAX_PHOTOS}. Front, back, both sides, inside and the odometer help most.`}>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {photos.map((p, i) => (
            <div key={p.key} className="pop-in relative aspect-square overflow-hidden rounded-2xl bg-zinc-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt="" className="size-full object-cover" />
              {!busy && (
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          ))}
          {photos.length < MAX_PHOTOS && !busy && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line text-sm text-muted transition hover:border-accent hover:bg-accent/5 hover:text-accent"
            >
              <ImagePlus className="size-6" />
              Add photos
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </Section>

      <Section title="Your details" hint="Only we see these. We never show your number on the website.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Your name" required>
            <input name="name" className={input} autoComplete="name" required maxLength={80} />
          </Field>
          <Field label="Mobile number" required>
            <input name="phone" type="tel" inputMode="tel" className={input} autoComplete="tel" placeholder="98765 43210" required />
          </Field>
        </div>
        {/* Bots fill every field; people never see this one. */}
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      </Section>

      <p className="flex gap-2 rounded-2xl bg-background p-4 text-xs leading-relaxed text-muted">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          When we list your car, we&apos;ll check the RC and insurance in person, and with your OK keep a copy to verify the sale.
          Copies are private, never shown on the website, and deleted 30 days after the car is sold.{" "}
          <Link href="/privacy" className="font-medium text-foreground underline underline-offset-2">
            How we handle your details
          </Link>
        </span>
      </p>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="relative inline-flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-accent font-semibold text-accent-ink shadow-lg shadow-accent/25 transition hover:-translate-y-0.5 hover:bg-accent-deep disabled:translate-y-0 disabled:opacity-80 sm:w-auto sm:px-10"
      >
        {stage === "uploading" && photos.length > 0 && (
          <span
            className="absolute inset-y-0 left-0 bg-white/20 transition-[width] duration-500"
            style={{ width: `${(progress / photos.length) * 100}%` }}
          />
        )}
        {busy && <Loader2 className="relative size-4 animate-spin" />}
        {stage === "uploading" ? `Uploading photos ${progress}/${photos.length}` : stage === "sending" ? "Sending…" : "Send my car"}
      </button>
    </form>
  );
}

const input =
  "h-11 w-full rounded-xl border border-line bg-background/50 px-3.5 text-sm outline-none transition focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15 disabled:opacity-60";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-6">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
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
