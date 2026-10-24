import type { Metadata } from "next";
import { CarCard } from "@/components/CarCard";
import { Reveal } from "@/components/motion/Reveal";
import { PageHero } from "@/components/PageHero";
import { getSoldCars } from "@/lib/cars";

// Served from cache and rebuilt at most once a minute; admin changes refresh it straight away.
export const revalidate = 60;

export const metadata: Metadata = { title: "Recently sold" };

export default async function SoldPage() {
  const cars = await getSoldCars(60);
  return (
    <>
      <PageHero eyebrow="Proof it works" title="Recently sold">
        Cars that found new owners through us. We don&apos;t show what they sold for.
      </PageHero>
      <div className="mx-auto max-w-6xl px-4 pt-10">
        {cars.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {cars.map((car, i) => (
              <Reveal key={car.id} delay={(i % 3) * 80}>
                <CarCard car={car} compact />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="rounded-3xl border border-dashed border-line p-10 text-center text-muted">Nothing here yet.</p>
        )}
      </div>
    </>
  );
}
