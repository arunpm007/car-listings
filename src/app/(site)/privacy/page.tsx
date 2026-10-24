import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { getSite } from "@/lib/settings";

// Served from cache and rebuilt at most once a minute; admin changes refresh it straight away.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Privacy",
  description: "What we collect when you sell or ask about a car, why, how long we keep it, and how to have it deleted.",
};

// Change this whenever the notice changes.
const UPDATED = "24 October 2026";

/**
 * Plain-language privacy notice. Every statement here must stay true to what the code does:
 * the sell form, request photos, document copies, rate limits and contact-tap counts.
 */
export default async function PrivacyPage() {
  const site = await getSite();
  const contact = (
    <>
      call or WhatsApp us on <strong className="whitespace-nowrap text-foreground">{site.phone}</strong>
      {site.email && (
        <>
          {" "}or email <strong className="text-foreground">{site.email}</strong>
        </>
      )}
    </>
  );

  return (
    <>
      <PageHero eyebrow="Privacy" title="Your details, kept simple">
        What we collect when you sell a car or ask about one, why, how long we keep it, and how to have it deleted.
      </PageHero>

      <article className="mx-auto max-w-3xl space-y-10 px-4 pt-10 text-[15px] leading-relaxed text-muted [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:pl-1 [&_section]:space-y-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        <section>
          <h2>Who we are</h2>
          <p>
            {site.name} helps owners in {site.city} sell their used cars and helps buyers find them. We don&apos;t own the cars;
            we list them on the owners&apos; behalf. For anything about your details, {contact}.
          </p>
        </section>

        <section>
          <h2>If you sell your car through us</h2>
          <p>The Sell form asks for:</p>
          <ul>
            <li>your name and mobile number, so we can call you back;</li>
            <li>the car&apos;s details, the price you expect, the area it&apos;s in and anything else you tell us;</li>
            <li>photos of the car, if you add them.</li>
          </ul>
          <p>
            Photos are shrunk on your own phone before they&apos;re sent, which also removes hidden data such as the location
            they were taken. They stay private until we list your car with your agreement; only then do they appear on the
            website. Your name and number are never shown on the website; at most it shows the general area the car is in.
          </p>
          <p>
            When we list a car, we check the RC and insurance in person. With your permission we keep a copy to confirm the
            sale. Copies are private, never shown on the website, and deleted 30 days after the car is sold or taken off the
            site.
          </p>
        </section>

        <section>
          <h2>If you ask about a car</h2>
          <p>
            When you call or WhatsApp us, we may note your name, your number and the car you asked about, so we can follow
            up, arrange a viewing, or tell you when the car is sold. That note is only for us.
          </p>
        </section>

        <section>
          <h2>Keeping out spam</h2>
          <p>
            To stop people flooding the forms, we count how many requests come from the same internet connection and the
            same phone number. We store only a scrambled code made from them, never the address or number itself, and those
            counts are deleted within a day.
          </p>
          <p>We also count taps on each car&apos;s Call and WhatsApp buttons, with no details about who tapped.</p>
        </section>

        <section>
          <h2>What we don&apos;t do</h2>
          <ul>
            <li>We don&apos;t sell or give your details to anyone for marketing.</li>
            <li>There are no ads, tracking cookies or analytics on this website. The only cookies are the ones that keep our staff signed in.</li>
            <li>We only share a seller&apos;s details with a buyer, or a buyer&apos;s with a seller, when you&apos;ve agreed to it as part of a sale.</li>
          </ul>
        </section>

        <section>
          <h2>Who stores it</h2>
          <p>
            Your details and photos are kept with Supabase, in their data centre in Mumbai, India. The website itself is served
            by Netlify, which, like any web host, briefly keeps standard records of visits. Neither uses your details for
            anything else.
          </p>
        </section>

        <section>
          <h2>How long we keep it</h2>
          <ul>
            <li>Sell requests: while we&apos;re working on your car. Ask any time and we&apos;ll delete yours.</li>
            <li>Photos from a request you didn&apos;t finish sending: deleted automatically within a few hours.</li>
            <li>Copies of papers: deleted 30 days after the car is sold or taken off the site.</li>
            <li>Spam-protection counts: deleted within a day.</li>
          </ul>
        </section>

        <section>
          <h2>Your choices</h2>
          <p>
            You can ask to see the details we hold about you, correct them, or have them deleted, and you can withdraw your
            permission to keep copies of your papers. To do any of this, {contact}. We&apos;ll do it as soon as we can,
            and tell you when it&apos;s done.
          </p>
        </section>

        <p className="border-t border-line pt-6 text-sm">Last updated {UPDATED}.</p>
      </article>
    </>
  );
}
