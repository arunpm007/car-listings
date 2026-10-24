import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { CarCard } from "@/components/CarCard";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ContactButtons } from "@/components/ContactButtons";
import { CountUp } from "@/components/motion/CountUp";
import { Reveal } from "@/components/motion/Reveal";
import { QuickSearch } from "@/components/QuickSearch";
import { getSite } from "@/lib/settings";
import { getAvailableCars, getBrandsInStock, getSoldCars, getSoldCount } from "@/lib/cars";
import { carPath } from "@/lib/car-url";
import { categoryLabel, formatPriceShort } from "@/lib/format";
import { photoUrl } from "@/lib/supabase/env";
import { CATEGORIES } from "@/lib/types";

// Served from cache and rebuilt at most once a minute; admin changes refresh it straight away.
export const revalidate = 60;



export default async function HomePage() {
  const [available, sold, soldCount, brandsInStock, site] = await Promise.all([
    getAvailableCars({}, 200),
    getSoldCars(8),
    getSoldCount(),
    getBrandsInStock(),
    getSite(),
  ]);

  const hero = available.find((c) => c.featured && c.photos.length) ?? available.find((c) => c.photos.length);
  const latest = available.slice(0, 6);
  const typeCounts = CATEGORIES.map((key) => ({ key, count: available.filter((c) => c.model.category === key).length })).filter((t) => t.count > 0);
  const brandCounts = brandsInStock
    .map((b) => ({ ...b, count: available.filter((c) => c.brand.slug === b.slug).length }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return (
    <>
      {/* Hero */}
      <section className="relative -mt-14 overflow-hidden bg-night pt-14 md:-mt-16 md:pt-16 text-white">
        <div className="pointer-events-none absolute -left-40 top-0 size-[36rem] rounded-full bg-accent/25 blur-[120px]" />

        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-8 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-12 md:pb-20 md:pt-20">
          <div>
            <p className="rise inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              {available.length} {available.length === 1 ? "car" : "cars"} available{site.city ? ` in ${site.city}` : ""}
            </p>
            <h1
              className="rise mt-4 font-display text-[2.5rem] font-bold leading-[0.98] sm:text-6xl md:mt-5 lg:text-7xl"
              style={{ "--delay": "80ms" } as React.CSSProperties}
            >
              Second-hand cars, <span className="text-accent">checked first-hand.</span>
            </h1>
            <p className="rise mt-5 max-w-lg text-lg text-white/65" style={{ "--delay": "160ms" } as React.CSSProperties}>
              We visit every car, check its papers and price it fairly. You call one number and we handle the rest.
            </p>
            <div className="rise mt-8 max-w-xl" style={{ "--delay": "240ms" } as React.CSSProperties}>
              <QuickSearch brands={brandsInStock} />
            </div>
          </div>

          {hero && (
            <Link href={carPath(hero)} className="rise group relative block" style={{ "--delay": "200ms" } as React.CSSProperties}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] ring-1 ring-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoUrl(hero.photos[0].full_path)}
                  alt={`${hero.year} ${hero.brand.name} ${hero.model.name}`}
                  className="drift size-full object-cover transition duration-700 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-night/70 via-transparent to-transparent" />
              </div>
              <div className="relative mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-xl transition duration-500 group-hover:-translate-y-1 md:absolute md:-bottom-6 md:left-8 md:mt-0 md:min-w-80">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-white/60 sm:text-xs">Pick of the week</p>
                  <p className="font-display text-base font-semibold leading-snug sm:text-lg">
                    {hero.year} {hero.brand.name} {hero.model.name}
                  </p>
                </div>
                <p className="shrink-0 whitespace-nowrap font-display text-lg font-bold text-accent sm:text-xl">{formatPriceShort(hero.price)}</p>
              </div>
            </Link>
          )}
        </div>
      </section>

      {/* Numbers */}
      <section className="mx-auto -mt-px max-w-6xl px-4">
        <div className="grid grid-cols-3 divide-x divide-line rounded-b-3xl border border-t-0 border-line bg-surface">
          <Stat value={<CountUp value={available.length} />} label="Cars on sale now" />
          <Stat value={<CountUp value={soldCount} />} label="Found new owners" />
          <Stat value={<CountUp value={brandsInStock.length} />} label="Brands in stock" />
        </div>
      </section>

      {/* Latest */}
      <section className="mx-auto max-w-6xl px-4 pt-14 sm:pt-20">
        <SectionHead eyebrow="Fresh arrivals" title="Cars on sale now" href="/cars" cta={`View all ${available.length}`} />
        {latest.length ? (
          <div className="no-scrollbar -mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mt-8 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
            {latest.map((car, i) => (
              <Reveal key={car.id} delay={(i % 3) * 90} className="w-[82%] shrink-0 snap-start sm:w-auto">
                <CarCard car={car} priority={i < 3} />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="mt-8 rounded-3xl border border-dashed border-line p-10 text-center text-muted">
            New cars are on their way. Message us to hear first.
          </p>
        )}
      </section>

      {/* Types */}
      {typeCounts.length > 1 && (
        <section className="mx-auto max-w-6xl px-4 pt-14 sm:pt-20">
          <SectionHead eyebrow="Browse" title="Find by type" href="/cars" cta="All cars" />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-4">
            {typeCounts.map((t, i) => (
              <Reveal key={t.key} delay={i * 70}>
                <Link
                  href={`/cars?type=${t.key}`}
                  className="group flex h-full flex-col gap-4 rounded-3xl border border-line bg-surface p-4 transition duration-300 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-lg sm:p-5"
                >
                  <CategoryIcon category={t.key} className="h-9 w-24 text-foreground/70 transition duration-500 group-hover:translate-x-1.5 group-hover:text-accent" />
                  <div>
                    <p className="font-display text-xl font-semibold">{categoryLabel[t.key].name}</p>
                    <p className="text-sm text-muted">{categoryLabel[t.key].hint}</p>
                    <p className="mt-2 text-sm font-semibold">
                      {t.count} {t.count === 1 ? "car" : "cars"}
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Brands */}
      <section className="mx-auto max-w-6xl px-4 pt-14 sm:pt-20">
        <SectionHead eyebrow="Browse" title="Cars by brand" href="/cars" cta="All cars" />
        <Reveal>
          <ul className="mt-6 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface sm:mt-8 sm:grid sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3">
            {brandCounts.map((b) => (
              <li key={b.slug} className="sm:border-b sm:border-line">
                <Link href={`/cars?brand=${b.slug}`} className="group flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-background">
                  <span className="font-display text-lg font-semibold">{b.name}</span>
                  <span className="flex items-center gap-2 text-sm text-muted">
                    {b.count} {b.count === 1 ? "car" : "cars"}
                    <ArrowRight className="size-4 transition group-hover:translate-x-1 group-hover:text-accent" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:pt-24">
        <SectionHead eyebrow="How it works" title="Buying through us is simple" />
        <ol className="mt-6 grid gap-6 border-t border-line pt-6 md:mt-10 md:grid-cols-3 md:pt-8">
          {[
            { title: "Pick a car", text: "Every listing is a car we have seen in person, with real photos." },
            { title: "Call or WhatsApp", text: "Quote the car code. We set up a viewing and a test drive." },
            { title: "Agree and drive away", text: "Prices are open to discussion. We help with the papers." },
          ].map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 120} className="flex gap-4 md:block">
              <span className="font-display text-4xl font-bold leading-none text-accent md:text-5xl">0{i + 1}</span>
              <div>
                <p className="font-display text-lg font-semibold md:mt-4 md:text-xl">{step.title}</p>
                <p className="mt-1 text-sm text-muted md:mt-2 md:text-base">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
        <Reveal className="mt-8 grid gap-3 sm:grid-cols-2 md:mt-10">
          <Pledge title="Inspected before listing" text="We check the car, service record and RC before it goes up." />
          <Pledge title="Owner details stay private" text="You deal with us. Nobody gets the owner's number from the site." />
        </Reveal>
      </section>

      {/* Sold */}
      {sold.length > 0 && (
        <section className="pt-16 sm:pt-24">
          <div className="mx-auto max-w-6xl px-4">
            <SectionHead eyebrow="Proof it works" title="Recently sold" href="/sold" cta="See all" />
          </div>
          <div className="no-scrollbar mx-auto mt-6 flex max-w-6xl snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mt-8 sm:gap-5">
            {sold.map((car) => (
              <div key={car.id} className="w-64 shrink-0 snap-start sm:w-72">
                <CarCard car={car} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sell banner */}
      <section className="mx-auto mt-16 max-w-6xl px-4 sm:mt-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-night p-6 text-white sm:p-12">
            <div className="relative grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-accent">Selling?</p>
                <h2 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-5xl">Turn your car into cash, without the hassle.</h2>
                <p className="mt-3 max-w-md text-white/70">
                  Send the details in two minutes. We come and see it, then bring you serious buyers.
                </p>
              </div>
              <div className="grid gap-2">
                <Link
                  href="/sell"
                  className="group inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-white transition hover:-translate-y-0.5 hover:bg-accent-deep"
                >
                  Send your car details
                  <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
                </Link>
                <ContactButtons message="Hi, I want to sell my car." size="lg" className="[&>a]:rounded-2xl [&>a:first-child]:bg-white/10" />
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="px-2 py-4 text-center sm:px-3 sm:py-7">
      <p className="font-display text-3xl font-bold sm:text-4xl">{value}</p>
      <p className="mt-1 text-[11px] leading-tight text-muted sm:text-sm">{label}</p>
    </div>
  );
}

function SectionHead({ eyebrow, title, href, cta }: { eyebrow: string; title: string; href?: string; cta?: string }) {
  return (
    <Reveal className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">{eyebrow}</p>
        <h2 className="mt-1.5 font-display text-[1.75rem] font-bold leading-tight sm:mt-2 sm:text-4xl">{title}</h2>
      </div>
      {href && cta && (
        <Link href={href} className="group inline-flex items-center gap-1.5 text-sm font-semibold hover:text-accent">
          {cta}
          <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
        </Link>
      )}
    </Reveal>
  );
}

function Pledge({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-3xl border border-line bg-surface p-5">
      <Check className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-muted">{text}</p>
      </div>
    </div>
  );
}
