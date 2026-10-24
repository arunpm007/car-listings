import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {/* Clears the fixed header. The home hero pulls itself back up underneath it. */}
      <main className="flex-1 pt-14 md:pt-16">{children}</main>
      <SiteFooter />
    </>
  );
}
