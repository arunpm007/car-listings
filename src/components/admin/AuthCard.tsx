"use client";

import { useSite } from "@/components/SiteProvider";

/** The small centred card used by the sign-in, reset and two-step pages. */
export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  const site = useSite();
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-line bg-surface p-6">
        <div>
          <p className="text-sm text-muted">{site.name}</p>
          <h1 className="text-xl font-bold">{title}</h1>
        </div>
        {children}
      </div>
    </main>
  );
}
