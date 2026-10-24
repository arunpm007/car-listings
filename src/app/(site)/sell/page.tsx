import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { SellForm } from "@/components/SellForm";
import { getSite } from "@/lib/settings";
import { getCatalog } from "@/lib/cars";

// Served from cache and rebuilt at most once a minute; admin changes refresh it straight away.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    title: "Sell your car",
    description: `Tell us about your car and we will find a buyer${site.city ? ` in ${site.city}` : ""}. No garage visit needed.`,
  };
}

export default async function SellPage() {
  const { brands, models } = await getCatalog();
  return (
    <>
      <PageHero eyebrow="Sell your car" title="Sell without the running around">
        Tell us about the car and send a few photos. We come and check it, list it, and bring you buyers. You stay the owner
        until the deal is done.
      </PageHero>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-6 sm:gap-10 sm:pt-10 lg:grid-cols-[1fr_2fr]">
        <ol className="space-y-2 sm:space-y-3 lg:sticky lg:top-24 lg:self-start">
          <Step n={1} title="Send details" delay={0}>
            Takes two minutes on your phone.
          </Step>
          <Step n={2} title="We call you" delay={80}>
            We agree a price and visit the car.
          </Step>
          <Step n={3} title="We find a buyer" delay={160}>
            Viewings and paperwork go through us.
          </Step>
        </ol>
        <SellForm brands={brands} models={models} />
      </div>
    </>
  );
}

function Step({ n, title, delay, children }: { n: number; title: string; delay: number; children: React.ReactNode }) {
  return (
    <li className="rise flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 sm:items-start sm:gap-4 sm:rounded-3xl sm:p-5" style={{ "--delay": `${delay + 150}ms` } as React.CSSProperties}>
      <span aria-hidden className="w-8 shrink-0 font-display text-3xl font-bold leading-none text-accent">{n}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="text-muted">{children}</span>
      </span>
    </li>
  );
}
