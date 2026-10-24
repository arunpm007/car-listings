import type { Metadata } from "next";
import { CarCard } from "@/components/CarCard";
import { CarFilters, type BrandCount, type CategoryCount } from "@/components/CarFilters";
import { Reveal } from "@/components/motion/Reveal";
import { PageHero } from "@/components/PageHero";
import { getAvailableCars, parseFilters } from "@/lib/cars";
import { whatsappHref } from "@/lib/contact";
import { getSite } from "@/lib/settings";
import { CATEGORIES } from "@/lib/types";

export const metadata: Metadata = { title: "Used cars for sale" };

export default async function CarsPage({ searchParams }: PageProps<"/cars">) {
  const filters = parseFilters(await searchParams);
  const [cars, all, site] = await Promise.all([getAvailableCars(filters), getAvailableCars({}, 500), getSite()]);

  // Each row counts within the other row's choice: with "SUV" picked, brand chips count SUVs.
  const inType = filters.category ? all.filter((c) => c.model.category === filters.category) : all;
  const inBrand = filters.brand ? all.filter((c) => c.brand.slug === filters.brand) : all;

  const counts = new Map<string, BrandCount>();
  for (const c of inType) {
    const entry = counts.get(c.brand.slug) ?? { slug: c.brand.slug, name: c.brand.name, count: 0 };
    entry.count++;
    counts.set(c.brand.slug, entry);
  }
  const brands = [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  // How many in the current type/brand choice can be seen today.
  const readyCount = inType.filter((c) => c.with_us && (!filters.brand || c.brand.slug === filters.brand)).length;

  // Only types that have cars right now (counted across all brands, so the row stays steady).
  const categories: CategoryCount[] = CATEGORIES.map((key) => ({ key, count: inBrand.filter((c) => c.model.category === key).length })).filter(
    (c) => all.some((car) => car.model.category === c.key),
  );

  return (
    <>
      <PageHero eyebrow="Buy a car" title="Used cars for sale">
        Every car is inspected in person. Prices are open to discussion.
      </PageHero>

      <div className="sticky top-14 z-30 border-b border-line bg-background/85 backdrop-blur-xl md:top-16">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <CarFilters categories={categories} brands={brands} total={inType.length} count={cars.length} readyCount={readyCount} />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-4 sm:pt-8">
        {cars.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {cars.map((car, i) => (
              <Reveal key={car.id} delay={(i % 3) * 80}>
                <CarCard car={car} priority={i < 3} compact />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="pop-in mx-auto max-w-md rounded-3xl border border-dashed border-line p-10 text-center">
            <p className="font-display text-xl font-semibold">Nothing matches, yet</p>
            <p className="mt-2 text-muted">New cars come in every week. Tell us what you want and we will look for it.</p>
            <a
              href={whatsappHref("Hi, I'm looking for a car. Here is what I want:", site.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex h-11 items-center rounded-full bg-whatsapp px-5 font-semibold text-white transition hover:-translate-y-0.5"
            >
              Tell us on WhatsApp
            </a>
          </div>
        )}
      </div>
    </>
  );
}
