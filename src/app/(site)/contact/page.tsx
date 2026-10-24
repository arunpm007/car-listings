import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import { ContactButtons } from "@/components/ContactButtons";
import { Reveal } from "@/components/motion/Reveal";
import { PageHero } from "@/components/PageHero";
import { getSite } from "@/lib/settings";

// Served from cache and rebuilt at most once a minute; admin changes refresh it straight away.
export const revalidate = 60;

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage() {
  const site = await getSite();
  return (
    <>
      <PageHero eyebrow="Contact" title="Talk to us">
        Buying or selling, one call is enough. We usually reply on WhatsApp within the hour.
      </PageHero>

      <div className="mx-auto max-w-6xl px-4 pt-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Reveal>
            <section className="h-full rounded-3xl border border-line bg-surface p-7">
              <h2 className="font-display text-2xl font-semibold">Buying a car</h2>
              <p className="mt-2 text-muted">Tell us the car code (like CAR-0012) and we will set up a viewing and a test drive.</p>
              <ContactButtons message="Hi, I am looking to buy a car." className="mt-6 [&>a]:rounded-2xl" size="lg" />
            </section>
          </Reveal>
          <Reveal delay={90}>
            <section className="h-full rounded-3xl border border-line bg-surface p-7">
              <h2 className="font-display text-2xl font-semibold">Selling your car</h2>
              <p className="mt-2 text-muted">
                The sell form takes two minutes. Or send 4–5 photos, the year, km driven and your price on WhatsApp.
              </p>
              <Link
                href="/sell"
                className="group mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent font-semibold text-accent-ink transition hover:bg-accent-deep"
              >
                Fill in the sell form <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden />
              </Link>
              <ContactButtons message="Hi, I want to sell my car. Here are the details:" className="mt-2 [&>a]:rounded-2xl" />
            </section>
          </Reveal>
        </div>

        <Reveal className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {site.address && (
            <a
              href={site.mapUrl ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex gap-3 rounded-3xl border border-line bg-surface p-7 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <MapPin className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
              <div>
                <p className="font-semibold">Address</p>
                <p className="mt-1 text-muted">{site.address}</p>
              </div>
            </a>
          )}
          <div className="flex gap-3 rounded-3xl border border-line bg-surface p-7">
            <Clock className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <div>
              <p className="font-semibold">Hours</p>
              <p className="mt-1 text-muted">{site.hours}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </>
  );
}
