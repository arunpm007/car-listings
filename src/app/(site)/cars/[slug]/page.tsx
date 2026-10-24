import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { CalendarDays, ChevronRight, CircleAlert, CircleCheck, Fuel, Gauge, MapPin, Palette, Settings2, ShieldCheck, Users } from "lucide-react";
import { CarCard } from "@/components/CarCard";
import { WhereTag } from "@/components/WhereTag";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ContactButtons } from "@/components/ContactButtons";
import { Gallery } from "@/components/Gallery";
import { Reveal } from "@/components/motion/Reveal";
import { ShareButton } from "@/components/ShareButton";
import { getSite } from "@/lib/settings";
import { getAvailableCars, getCar } from "@/lib/cars";
import { carPath, carTitle, idFromSlug } from "@/lib/car-url";
import {
  categoryLabel,
  formatDate,
  formatKm,
  formatOwners,
  formatPrice,
  formatPriceShort,
  fuelLabel,
  transmissionLabel,
} from "@/lib/format";
import { photoUrl } from "@/lib/supabase/env";
import type { CarWithRelations } from "@/lib/types";

// Served from cache and rebuilt at most once a minute; admin changes refresh it straight away.
export const revalidate = 60;

// No pages are built ahead of time; each car page is built on its first visit, then cached.
export async function generateStaticParams() {
  return [];
}

async function load(slug: string) {
  const id = idFromSlug(slug);
  return id ? getCar(id) : null;
}

export async function generateMetadata({ params }: PageProps<"/cars/[slug]">): Promise<Metadata> {
  const car = await load((await params).slug);
  if (!car) return {};
  const title = carTitle(car);
  const description = `${formatPriceShort(car.price)}${car.negotiable ? " (negotiable)" : ""} · ${formatKm(car.km_driven)} · ${fuelLabel[car.fuel]} · ${transmissionLabel[car.transmission]}${car.area ? ` · ${car.area}` : ""}`;
  const cover = car.photos[0];
  return {
    title,
    description,
    alternates: { canonical: carPath(car) },
    openGraph: {
      title: `${title} — ${formatPriceShort(car.price)}`,
      description,
      images: cover ? [{ url: photoUrl(cover.full_path), width: cover.width ?? undefined, height: cover.height ?? undefined }] : undefined,
    },
  };
}

/** Same type of car first, then same brand, then anything within about 30% of the price. */
function similarTo(car: CarWithRelations, all: CarWithRelations[]) {
  const others = all.filter((c) => c.id !== car.id);
  const score = (c: CarWithRelations) =>
    (c.model.category && c.model.category === car.model.category ? 2 : 0) +
    (c.brand_id === car.brand_id ? 1 : 0) +
    (Math.abs(c.price - car.price) / car.price < 0.3 ? 1 : 0);
  return others
    .map((c) => ({ c, s: score(c) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .map((x) => x.c);
}

export default async function CarPage({ params }: PageProps<"/cars/[slug]">) {
  const { slug } = await params;
  const [car, available, site] = await Promise.all([load(slug), getAvailableCars({}, 200), getSite()]);
  if (!car) notFound();

  const canonical = carPath(car);
  if (canonical !== `/cars/${slug}`) permanentRedirect(canonical);

  const title = carTitle(car);
  const sold = car.status === "sold";
  const message = `Hi, I'm interested in ${car.code} — ${title}, listed at ${formatPriceShort(car.price)}. Is it still available?`;
  const similar = similarTo(car, available);

  // Only what was actually checked; nothing about the documents themselves.
  const papers = [
    car.papers_rc_seen && { ok: true, label: "RC original verified", detail: `${formatOwners(car.owners)}${car.rto ? ` · registered at ${car.rto}` : ""}` },
    car.papers_insurance && { ok: true, label: "Insurance valid", detail: car.insurance_valid_until ? `Until ${formatDate(car.insurance_valid_until)}` : null },
    car.papers_puc && { ok: true, label: "PUC valid", detail: null },
    car.papers_service_records && { ok: true, label: "Service records available", detail: null },
    car.papers_loan === "none" && { ok: true, label: "No loan on the car", detail: null },
    car.papers_loan === "closing" && { ok: false, label: "Loan being closed", detail: "Bank NOC is handed over before the sale" },
  ].filter(Boolean) as { ok: boolean; label: string; detail: string | null }[];

  const specs = [
    { icon: CalendarDays, label: "Year", value: String(car.year) },
    { icon: Gauge, label: "Km driven", value: formatKm(car.km_driven) },
    { icon: Fuel, label: "Fuel", value: fuelLabel[car.fuel] },
    { icon: Settings2, label: "Gearbox", value: transmissionLabel[car.transmission] },
    { icon: Users, label: "Ownership", value: formatOwners(car.owners) },
    ...(car.color ? [{ icon: Palette, label: "Colour", value: car.color }] : []),
    ...(car.rto ? [{ icon: MapPin, label: "Registered at", value: car.rto }] : []),
    ...(car.insurance_valid_until
      ? [{ icon: ShieldCheck, label: "Insurance until", value: formatDate(car.insurance_valid_until) }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-0 sm:pt-6">
      <nav aria-label="Breadcrumb" className="mb-5 hidden items-center gap-1 text-sm text-muted sm:flex">
        <Link href="/cars" className="hover:text-foreground">
          Cars
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <Link href={`/cars?brand=${car.brand.slug}`} className="hover:text-foreground">
          {car.brand.name}
        </Link>
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="truncate text-foreground">{car.model.name}</span>
      </nav>

      <div className="grid gap-5 sm:gap-8 lg:grid-cols-[1.45fr_1fr] lg:gap-x-10">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <Gallery
            alt={title}
            transitionName={`car-photo-${car.id}`}
            photos={car.photos.map((p) => ({ full: photoUrl(p.full_path), thumb: photoUrl(p.thumb_path), credit: p.credit }))}
          />
        </div>
        <aside className="space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-24 lg:self-start">
          <div className="rise relative overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-[0_24px_48px_-28px_rgb(18_20_26/0.35)] sm:p-6">
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-black/5 px-2.5 py-1 font-mono font-medium">{car.code}</span>
              {car.model.category && (
                <Link
                  href={`/cars?type=${car.model.category}`}
                  title={categoryLabel[car.model.category].hint}
                  className="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-2.5 py-1 font-medium transition hover:bg-black/10"
                >
                  <CategoryIcon category={car.model.category} className="h-3 w-7" /> {categoryLabel[car.model.category].name}
                </Link>
              )}
              {car.status === "reserved" && <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-900">In deal</span>}
              {sold && <span className="rounded-full bg-sold px-2.5 py-1 font-semibold text-white">Sold</span>}
            </div>
            <h1 className="mt-3 font-display text-[1.75rem] font-bold leading-tight sm:mt-4 sm:text-4xl">
              {car.brand.name} {car.model.name}
            </h1>
            <p className="mt-1 text-muted">
              {car.year}
              {car.variant ? ` · ${car.variant}` : ""}
              {car.area ? ` · ${car.area}` : ""}
            </p>

            {sold ? (
              <div className="mt-6 rounded-2xl bg-background p-4">
                <p className="font-semibold">Sold{car.sold_at ? ` on ${formatDate(car.sold_at)}` : ""}.</p>
                <p className="mt-1 text-sm text-muted">Want something like it? Tell us and we will look out for one.</p>
                <ContactButtons message={`Hi, I saw ${car.code} (${title}) was sold. I'm looking for something similar.`} className="mt-4" />
              </div>
            ) : (
              <>
                <p className="mt-4 font-display text-3xl font-bold sm:mt-6 sm:text-4xl">{formatPrice(car.price)}</p>
                <p className="mt-1 text-sm text-muted">{car.negotiable ? "Negotiable — call us to discuss." : "Fixed price."}</p>
                <div className={`mt-4 rounded-2xl p-3 text-sm ${car.with_us ? "bg-emerald-50 text-emerald-900" : "bg-background text-foreground/80"}`}>
                  <WhereTag withUs={car.with_us} />
                  <p className="mt-1">
                    {car.with_us
                      ? "The car is with us. Call and come and see it, today if you like."
                      : "This car is still with its owner. Call us and we'll arrange a viewing, usually within a day or two."}
                  </p>
                </div>
                {car.status === "reserved" && (
                  <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
                    We are in talks with a buyer for this car. Call us: if the deal falls through, you are next.
                  </p>
                )}
                <ContactButtons message={message} carId={car.id} size="lg" className="mt-5 hidden md:grid [&>a]:rounded-2xl" />
                <p className="mt-3 text-xs text-muted">
                  Quote <span className="font-mono">{car.code}</span> when you call {site.phone}.
                </p>
              </>
            )}
            <ShareButton title={title} className="mt-4" />
          </div>

        </aside>
        <div className="min-w-0 lg:col-start-1">

          <section className="rise" style={{ "--delay": "120ms" } as React.CSSProperties}>
            <h2 className="font-display text-xl font-semibold sm:text-2xl">At a glance</h2>
            <dl className="mt-3 grid grid-cols-2 gap-2.5 sm:mt-4 sm:grid-cols-4 sm:gap-3">
              {specs.map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-2xl border border-line bg-surface p-4">
                  <dt className="flex items-center gap-1.5 text-xs text-muted">
                    <Icon className="size-3.5" aria-hidden /> {label}
                  </dt>
                  <dd className="mt-1.5 font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {papers.length > 0 && (
            <Reveal className="mt-10">
              <h2 className="font-display text-xl font-semibold sm:text-2xl">Papers checked</h2>
              <p className="mt-1 text-sm text-muted">Checked in person by {site.name}. Originals shown to you at the viewing.</p>
              <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {papers.map((p) => (
                  <li key={p.label} className="flex items-start gap-2.5 rounded-2xl border border-line bg-surface p-3.5">
                    {p.ok ? (
                      <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
                    ) : (
                      <CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
                    )}
                    <span>
                      <span className="block text-sm font-semibold">{p.label}</span>
                      {p.detail && <span className="text-xs text-muted">{p.detail}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}

          {car.description && (
            <Reveal className="mt-10">
              <h2 className="font-display text-2xl font-semibold">About this car</h2>
              <p className="mt-3 whitespace-pre-line text-lg leading-relaxed text-muted">{car.description}</p>
            </Reveal>
          )}
        </div>

      </div>

      {similar.length > 0 && (
        <section className="mt-14 sm:mt-20">
          <Reveal>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">You might also like</h2>
          </Reveal>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {similar.map((c, i) => (
              <Reveal key={c.id} delay={i * 90}>
                <CarCard car={c} compact />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {!sold && (
        <div className="mobile-contact-bar fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/90 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
          <div className="mb-2 flex items-baseline justify-between px-1">
            <span className="truncate text-sm font-medium">
              {car.brand.name} {car.model.name}
            </span>
            <span className="font-display text-lg font-bold">{formatPriceShort(car.price)}</span>
          </div>
          <ContactButtons message={message} carId={car.id} size="lg" className="[&>a]:rounded-2xl" />
        </div>
      )}
    </div>
  );
}
