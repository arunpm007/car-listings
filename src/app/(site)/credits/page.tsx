import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { createPublicClient } from "@/lib/supabase/public";

// Served from cache and rebuilt at most once a minute; admin changes refresh it straight away.
export const revalidate = 60;

export const metadata: Metadata = { title: "Photo credits" };

export default async function CreditsPage() {
  const supabase = createPublicClient();
  // Row level security limits this to photos of cars the public can see.
  const { data } = await supabase.from("car_photos").select("credit").not("credit", "is", null);
  const credits = [...new Set((data ?? []).map((r) => r.credit as string))].sort();

  return (
    <>
      <PageHero eyebrow="Thanks" title="Photo credits">
        Some photos on this site are by other photographers, shared under free licences.
      </PageHero>
      <div className="mx-auto max-w-3xl px-4 pt-10">
        {credits.length ? (
          <ul className="divide-y divide-line rounded-3xl border border-line bg-surface">
            {credits.map((c) => (
              <li key={c} className="px-6 py-4 text-sm">
                {c}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">All photos are our own.</p>
        )}
      </div>
    </>
  );
}
