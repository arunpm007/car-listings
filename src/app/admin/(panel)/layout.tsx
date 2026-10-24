import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getSite } from "@/lib/settings";
import { ConfirmProvider } from "@/components/admin/Dialog";
import { getAdminBadges } from "@/lib/admin-data";
import { createClient, getAdmin } from "@/lib/supabase/server";
import { purgeExpiredDocuments, signOut } from "../actions";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  // Password alone isn't enough: send them to set up or enter their two-step code.
  if (admin && !admin.mfa) redirect("/admin/mfa");
  if (!admin) {
    const { data } = await (await createClient()).auth.getClaims();
    if (!data?.claims) redirect("/admin/login");
    // Signed in, but not on the admins list.
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-xl font-bold">This account is not an admin</h1>
        <form action={signOut} className="mt-6">
          <button className="font-semibold text-accent hover:underline">Sign out</button>
        </form>
      </main>
    );
  }

  // Clears document copies kept past their 30 days after a sale.
  const [badges, site] = await Promise.all([getAdminBadges(), getSite(), purgeExpiredDocuments()]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-foreground text-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Link href="/admin" className="truncate font-bold">
            {site.name} <span className="hidden font-normal text-white/60 sm:inline">admin</span>
          </Link>
          <Link
            href="/admin/cars/new"
            className="ml-auto inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold"
          >
            <Plus className="size-4" aria-hidden /> Add car
          </Link>
          <Link href="/" className="hidden text-sm text-white/70 hover:text-white sm:inline">
            View site
          </Link>
          <form action={signOut}>
            <button className="whitespace-nowrap text-sm text-white/70 hover:text-white">Sign out</button>
          </form>
        </div>
      </header>
      <nav className="border-b border-line bg-surface">
        <div className="no-scrollbar mx-auto flex max-w-5xl gap-1 overflow-x-auto whitespace-nowrap px-4 text-sm font-medium">
          <Link href="/admin" className="px-3 py-2.5 hover:text-accent">
            Cars
          </Link>
          <Link href="/admin?tab=submitted" className="inline-flex items-center gap-1.5 px-3 py-2.5 hover:text-accent">
            Sell requests <Badge value={badges.newRequests} />
          </Link>
          <Link href="/admin/leads" className="inline-flex items-center gap-1.5 px-3 py-2.5 hover:text-accent">
            Leads <Badge value={badges.leadsDue} title="Follow-ups due" />
          </Link>
          <Link href="/admin/settings" className="ml-auto px-3 py-2.5 hover:text-accent">
            Settings
          </Link>
        </div>
      </nav>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <ConfirmProvider>{children}</ConfirmProvider>
      </main>
    </>
  );
}

function Badge({ value, title }: { value: number; title?: string }) {
  if (!value) return null;
  return (
    <span title={title} className="rounded-full bg-accent px-1.5 text-xs font-bold leading-5 text-accent-ink">
      {value}
    </span>
  );
}
