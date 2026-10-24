"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import clsx from "clsx";
import { saveCar, type CarInput } from "@/app/admin/actions";
import { categoryLabel, fuelLabel, transmissionLabel } from "@/lib/format";
import { resizePhoto } from "@/lib/photo-resize";
import { AmountInput } from "@/components/ui/AmountInput";
import { Select } from "@/components/ui/Select";
import { yearOptions } from "@/lib/amount";
import { createClient } from "@/lib/supabase/client";
import { PHOTO_BUCKET, photoUrl } from "@/lib/supabase/env";
import {
  FUELS,
  TRANSMISSIONS,
  isPublicStatus,
  CATEGORIES,
  type Category,
  type Brand,
  type Car,
  type CarStatus,
  type Fuel,
  type Transmission,
  type CarPrivate,
  type Model,
  type PhotoRef,
} from "@/lib/types";

/** The dashboard tab that lists a car with this status. */
function tabFor(status: CarStatus) {
  if (status === "listed" || status === "reserved") return "active";
  return status;
}

export const NEW_OPTION = "__new__";
const NEW = NEW_OPTION;

export type FormState = {
  brand_id: string;
  new_brand: string;
  model_id: string;
  new_model: string;
  variant: string;
  year: string;
  fuel: Fuel;
  transmission: Transmission;
  model_category: Category | "";
  km_driven: string;
  owners: string;
  color: string;
  rto: string;
  insurance_valid_until: string;
  price: string;
  negotiable: boolean;
  location: string;
  description: string;
  featured: boolean;
  with_us: boolean;
  seller_name: string;
  seller_phone: string;
  reg_number: string;
  seller_min_price: string;
  commission: string;
  notes: string;
};

type PhotoItem = {
  key: string;
  full_path?: string;
  thumb_path?: string;
  width: number | null;
  height: number | null;
  credit?: string | null;
  bucket?: "request-photos";
  preview: string;
  uploading: boolean;
  error?: string;
};

type Props = {
  brands: Brand[];
  models: Model[];
  car?: Car;
  privateDetails?: CarPrivate | null;
  photos?: PhotoRef[];
  /** Values from a sell request, laid over the defaults for a new car. */
  prefill?: Partial<FormState>;
  fromRequestId?: number;
};


export function CarForm({ brands, models, car, privateDetails, photos: initialPhotos = [], prefill, fromRequestId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [f, setF] = useState<FormState>(() => ({
    brand_id: car ? String(car.brand_id) : "",
    new_brand: "",
    model_id: car ? String(car.model_id) : "",
    new_model: "",
    variant: car?.variant ?? "",
    year: car ? String(car.year) : "",
    fuel: car?.fuel ?? "petrol",
    transmission: car?.transmission ?? "manual",
    model_category: "",
    km_driven: car ? String(car.km_driven) : "",
    owners: car ? String(car.owners) : "1",
    color: car?.color ?? "",
    rto: car?.rto ?? "",
    insurance_valid_until: car?.insurance_valid_until ?? "",
    price: car ? String(car.price) : "",
    negotiable: car?.negotiable ?? true,
    location: privateDetails?.location ?? "",
    description: car?.description ?? "",
    featured: car?.featured ?? false,
    with_us: car?.with_us ?? false,
    seller_name: privateDetails?.seller_name ?? "",
    seller_phone: privateDetails?.seller_phone ?? "",
    reg_number: privateDetails?.reg_number ?? "",
    seller_min_price: privateDetails?.seller_min_price ? String(privateDetails.seller_min_price) : "",
    commission: privateDetails?.commission ? String(privateDetails.commission) : "",
    notes: privateDetails?.notes ?? "",
    ...prefill,
  }));

  const [photos, setPhotos] = useState<PhotoItem[]>(() =>
    initialPhotos.map((p) => ({
      key: p.full_path,
      full_path: p.full_path,
      thumb_path: p.thumb_path,
      width: p.width,
      height: p.height,
      credit: p.credit ?? null,
      bucket: p.bucket,
      preview: p.thumb_url ?? photoUrl(p.thumb_path),
      uploading: false,
    })),
  );

  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => {
    setF((prev) => ({ ...prev, [key]: value }));
  };

  const newBrand = f.brand_id === NEW;
  const newModel = newBrand || f.model_id === NEW;
  const brandModels = useMemo(() => models.filter((m) => String(m.brand_id) === f.brand_id), [models, f.brand_id]);
  const pickedModel = models.find((m) => String(m.id) === f.model_id);
  // Ask for the type only when the model doesn't have one yet; it is then saved for every car of that model.
  const needsCategory = newModel || (pickedModel != null && pickedModel.category == null);
  const popular = brands.filter((b) => b.popular);
  const others = brands.filter((b) => !b.popular);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const supabase = createClient();
    const items = [...files].map((file) => ({
      file,
      item: {
        key: crypto.randomUUID(),
        width: null,
        height: null,
        preview: URL.createObjectURL(file),
        uploading: true,
      } satisfies PhotoItem,
    }));
    setPhotos((prev) => [...prev, ...items.map((i) => i.item)]);

    await Promise.all(
      items.map(async ({ file, item }) => {
        try {
          const resized = await resizePhoto(file);
          const base = `cars/${item.key}`;
          const opts = { contentType: "image/jpeg", cacheControl: "31536000" };
          const [full, thumb] = await Promise.all([
            supabase.storage.from(PHOTO_BUCKET).upload(`${base}-full.jpg`, resized.full, opts),
            supabase.storage.from(PHOTO_BUCKET).upload(`${base}-thumb.jpg`, resized.thumb, opts),
          ]);
          if (full.error || thumb.error) throw full.error ?? thumb.error;
          setPhotos((prev) =>
            prev.map((p) =>
              p.key === item.key
                ? {
                    ...p,
                    uploading: false,
                    full_path: full.data!.path,
                    thumb_path: thumb.data!.path,
                    width: resized.width,
                    height: resized.height,
                  }
                : p,
            ),
          );
        } catch (e) {
          const message = e instanceof Error ? e.message : "Upload failed";
          setPhotos((prev) => prev.map((p) => (p.key === item.key ? { ...p, uploading: false, error: message } : p)));
        }
      }),
    );
  }

  function move(index: number, to: number) {
    setPhotos((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(Math.max(0, Math.min(next.length, to)), 0, item);
      return next;
    });
  }

  function remove(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (photos.some((p) => p.uploading)) {
      setError("Wait for the photos to finish uploading.");
      return;
    }
    // Never drop a photo quietly: make them deal with the ones that failed.
    const failed = photos.filter((p) => p.error).length;
    if (failed) {
      setError(`${failed} ${failed === 1 ? "photo" : "photos"} didn't upload. Remove ${failed === 1 ? "it" : "them"} (bin icon) or add a JPG/PNG instead.`);
      return;
    }
    const input: CarInput = {
      brand_id: newBrand || !f.brand_id ? null : Number(f.brand_id),
      new_brand: newBrand ? f.new_brand : null,
      model_id: newModel || !f.model_id ? null : Number(f.model_id),
      new_model: newModel ? f.new_model : null,
      variant: f.variant,
      year: f.year,
      fuel: f.fuel,
      transmission: f.transmission,
      model_category: needsCategory && f.model_category ? f.model_category : null,
      km_driven: f.km_driven,
      owners: f.owners,
      color: f.color,
      rto: f.rto,
      insurance_valid_until: f.insurance_valid_until,
      price: f.price,
      negotiable: f.negotiable,
      location: f.location,
      description: f.description,
      featured: f.featured,
      with_us: f.with_us,
      private: {
        seller_name: f.seller_name,
        seller_phone: f.seller_phone,
        reg_number: f.reg_number,
        seller_min_price: f.seller_min_price || null,
        commission: f.commission || null,
        notes: f.notes,
      },
      photos: photos
        .filter((p) => p.full_path && p.thumb_path)
        .map((p) => ({ full_path: p.full_path!, thumb_path: p.thumb_path!, width: p.width, height: p.height, credit: p.credit ?? null, bucket: p.bucket })),
    };

    startTransition(async () => {
      const result = await saveCar(car?.id ?? null, input, fromRequestId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Back to the list, on the tab where this car now lives, with a note saying what happened.
      router.push(`/admin?${new URLSearchParams({ saved: String(result.id), ...(car ? {} : { added: "1" }), tab: car ? tabFor(car.status) : "verified" })}`);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <Section title="Photos" hint="First photo is the cover. Up to 30. Location data is removed automatically.">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {photos.map((p, i) => (
            <div key={p.key} className="group relative aspect-square overflow-hidden rounded-lg border border-line bg-zinc-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt="" className={clsx("size-full object-cover", p.uploading && "opacity-50")} />
              {p.uploading && <Loader2 className="absolute inset-0 m-auto size-6 animate-spin text-white" />}
              {p.error && (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-600/90 p-2 pb-9 text-center text-[11px] font-medium leading-snug text-white">
                  <span className="font-bold">Didn&apos;t upload</span>
                  {p.error}
                </span>
              )}
              {i === 0 && !p.error && (
                <span className="absolute left-1 top-1 rounded bg-accent px-1.5 text-[10px] font-bold uppercase text-white">Cover</span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 p-1">
                <IconButton label="Move left" onClick={() => move(i, i - 1)} disabled={i === 0}>
                  <ArrowLeft className="size-3.5" />
                </IconButton>
                <IconButton label="Make cover" onClick={() => move(i, 0)} disabled={i === 0}>
                  <Star className="size-3.5" />
                </IconButton>
                <IconButton label="Remove photo" onClick={() => remove(i)}>
                  <Trash2 className="size-3.5" />
                </IconButton>
                <IconButton label="Move right" onClick={() => move(i, i + 1)} disabled={i === photos.length - 1}>
                  <ArrowRight className="size-3.5" />
                </IconButton>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line text-sm text-muted hover:border-accent hover:text-accent"
          >
            <ImagePlus className="size-6" />
            Add photos
          </button>
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

      <Section title="The car">
        <div className="mb-5">
          <p className="text-sm font-medium">Where is the car now?</p>
          <div role="radiogroup" aria-label="Where is the car now?" className="mt-1.5 grid grid-cols-2 gap-2">
            {[
              { value: true, title: "With us", hint: "We have it or the keys. Buyers can see it any time." },
              { value: false, title: "With the owner", hint: "We arrange a viewing with the owner." },
            ].map((o) => (
              <button
                key={String(o.value)}
                type="button"
                role="radio"
                aria-checked={f.with_us === o.value}
                onClick={() => set("with_us", o.value)}
                className={clsx(
                  "rounded-xl border-2 p-3 text-left transition",
                  f.with_us === o.value ? "border-accent bg-accent/5" : "border-line hover:border-foreground/30",
                )}
              >
                <span className="block text-sm font-semibold">{o.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{o.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Brand" required>
            <Select
              label="Brand"
              required
              value={f.brand_id}
              onChange={(v) => (set("brand_id", v), set("model_id", ""))}
              placeholder="Choose brand"
              options={[
                ...popular.map((b) => ({ value: String(b.id), label: b.name, group: "Popular" })),
                ...others.map((b) => ({ value: String(b.id), label: b.name, group: "All brands" })),
                { value: NEW, label: "+ Brand not in the list", group: "Other" },
              ]}
            />
          </Field>
          {newBrand && (
            <Field label="New brand name" required>
              <input className={input} value={f.new_brand} onChange={(e) => set("new_brand", e.target.value)} required />
            </Field>
          )}

          {!newBrand && (
            <Field label="Model" required>
              <Select
                label="Model"
                required
                disabled={!f.brand_id}
                value={f.model_id}
                onChange={(v) => set("model_id", v)}
                placeholder={f.brand_id ? "Choose model" : "Choose a brand first"}
                options={[...brandModels.map((m) => ({ value: String(m.id), label: m.name })), { value: NEW, label: "+ Model not in the list" }]}
              />
            </Field>
          )}
          {newModel && (
            <Field label="New model name" hint="Added to the list for next time" required>
              <input className={input} value={f.new_model} onChange={(e) => set("new_model", e.target.value)} required />
            </Field>
          )}

          {needsCategory && (
            <Field label="Type of car" hint={`Saved for every ${newModel ? f.new_model || "car of this model" : pickedModel?.name}, so you only answer once`}>
              <Select
                label="Type of car"
                value={f.model_category}
                onChange={(v) => set("model_category", v as Category)}
                placeholder="Not sure — leave it"
                options={CATEGORIES.map((c) => ({ value: c, label: `${categoryLabel[c].name} — ${categoryLabel[c].hint}` }))}
              />
            </Field>
          )}
          <Field label="Variant" hint="e.g. VXI, SX 1.6 CRDi, ZX AT">
            <input className={input} value={f.variant} onChange={(e) => set("variant", e.target.value)} />
          </Field>
          <Field label="Year" required>
            <Select label="Year" required value={f.year} onChange={(v) => set("year", v)} placeholder="Choose year" options={yearOptions()} />
          </Field>
          <Field label="Fuel" required>
            <Select label="Fuel" value={f.fuel} onChange={(v) => set("fuel", v as typeof f.fuel)} options={FUELS.map((v) => ({ value: v, label: fuelLabel[v] }))} />
          </Field>
          <Field label="Gearbox" required>
            <Select
              label="Gearbox"
              value={f.transmission}
              onChange={(v) => set("transmission", v as typeof f.transmission)}
              options={TRANSMISSIONS.map((v) => ({ value: v, label: transmissionLabel[v] }))}
            />
          </Field>
          <Field label="Km driven" required>
            <AmountInput kind="km" label="Km driven" required value={f.km_driven} onChange={(v) => set("km_driven", v)} />
          </Field>
          <Field label="Owners" required>
            <Select label="Owners" value={f.owners} onChange={(v) => set("owners", v)} options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))} />
          </Field>
          <Field label="Colour">
            <input className={input} value={f.color} onChange={(e) => set("color", e.target.value)} />
          </Field>
          <Field label="Registered at (RTO)" hint="Public. Area code only, e.g. KA-12">
            <input className={input} value={f.rto} onChange={(e) => set("rto", e.target.value.toUpperCase())} />
          </Field>
          <Field label="Insurance valid until">
            <input className={input} type="date" value={f.insurance_valid_until} onChange={(e) => set("insurance_valid_until", e.target.value)} />
          </Field>
          <Field label="Location" hint="Area or town where the car is. For your records; not shown on the website for now.">
            <input className={input} value={f.location} onChange={(e) => set("location", e.target.value)} />
          </Field>
        </div>
        <Field label="Description" className="mt-4">
          <textarea className={clsx(input, "h-28 py-2")} value={f.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
      </Section>

      <Section title="Price">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Asking price" required>
            <AmountInput kind="price" label="Asking price" required value={f.price} onChange={(v) => set("price", v)} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-6">
          <Check label="Price is negotiable" checked={f.negotiable} onChange={(v) => set("negotiable", v)} />
          <Check label="Feature on the home page" checked={f.featured} onChange={(v) => set("featured", v)} />
        </div>
      </Section>

      <Section title="Owner details" hint="Only you see these. Never shown on the website.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Seller name">
            <input className={input} value={f.seller_name} onChange={(e) => set("seller_name", e.target.value)} />
          </Field>
          <Field label="Seller phone">
            <input className={input} type="tel" value={f.seller_phone} onChange={(e) => set("seller_phone", e.target.value)} />
          </Field>
          <Field label="Full registration number">
            <input className={input} value={f.reg_number} onChange={(e) => set("reg_number", e.target.value.toUpperCase())} />
          </Field>
          <Field label="Seller's lowest price">
            <AmountInput kind="price" label="Seller's lowest price" value={f.seller_min_price} onChange={(v) => set("seller_min_price", v)} />
          </Field>
          <Field label="Your commission">
            <AmountInput kind="price" label="Your commission" defaultUnit="thousand" value={f.commission} onChange={(v) => set("commission", v)} />
          </Field>
        </div>
        <Field label="Notes" className="mt-4">
          <textarea className={clsx(input, "h-24 py-2")} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </Section>

      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-accent px-6 font-semibold text-accent-ink disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {car ? "Save changes" : "Add car"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!error && (
          <p className="text-xs leading-snug text-muted sm:text-sm">
            {car && isPublicStatus(car.status)
              ? "This car is live; your changes show on the website once saved."
              : "Saving keeps it off the website. Publish it from the dashboard."}
          </p>
        )}
      </div>
    </form>
  );
}

const input = "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm disabled:bg-zinc-50";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
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

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--accent)]" />
      {label}
    </label>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-30">
      {children}
    </button>
  );
}
