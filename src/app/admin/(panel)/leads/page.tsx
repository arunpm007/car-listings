import Link from "next/link";
import clsx from "clsx";
import { LeadForm, LeadList, type CarOption } from "@/components/admin/Leads";
import { getLeads } from "@/lib/admin-data";
import { getAllCarsForAdmin } from "@/lib/cars";
import { todayInIndia } from "@/lib/format";

export const metadata = { title: "Leads" };

export default async function LeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  const closed = (await searchParams).view === "closed";
  const [leads, cars] = await Promise.all([getLeads({ open: !closed }), getAllCarsForAdmin()]);
  const carOptions: CarOption[] = cars
    .filter((c) => c.status !== "archived")
    .map((c) => ({ id: c.id, label: `${c.code} · ${c.year} ${c.brand.name} ${c.model.name}${c.status === "sold" ? " (sold)" : ""}` }));

  return (
    <>
      <h1 className="text-2xl font-bold">Leads</h1>
      <p className="mt-1 text-sm text-muted">Buyers who called or messaged. Add them after the call so nobody is forgotten.</p>

      <section className="mt-6 rounded-xl border border-line bg-surface p-5">
        <h2 className="mb-3 font-semibold">Add a lead</h2>
        <LeadForm cars={carOptions} />
      </section>

      <nav className="-mx-4 mt-8 flex gap-1 border-b border-line px-4">
        {[
          { href: "/admin/leads", label: "Open", active: !closed },
          { href: "/admin/leads?view=closed", label: "Bought or lost", active: closed },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={clsx(
              "border-b-2 px-3 py-2 text-sm font-medium",
              t.active ? "border-accent" : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className="mt-4">
        <LeadList leads={leads} cars={carOptions} today={todayInIndia()} />
      </div>
    </>
  );
}
