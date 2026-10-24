import { AdminsPanel } from "@/components/admin/AdminsPanel";
import { SettingsPanel } from "@/components/admin/SettingsPanel";
import { getAdminAccounts } from "@/lib/admin-data";
import { getSite } from "@/lib/settings";
import { getAdmin, requireAdmin } from "@/lib/supabase/server";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin();
  const [site, admins, me] = await Promise.all([getSite(), getAdminAccounts(), getAdmin()]);
  return (
    <>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Business name and contact details used across the website.</p>
      <SettingsPanel site={site} />
      <AdminsPanel admins={admins} meId={me?.id ?? ""} />
    </>
  );
}
