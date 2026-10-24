import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { siteUrl } from "@/config/site";
import { SiteProvider } from "@/components/SiteProvider";
import { getSite } from "@/lib/settings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSite();
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: site.city ? `${site.name} · Used cars in ${site.city}` : site.name,
      template: `%s · ${site.name}`,
    },
    description: site.tagline,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const site = await getSite();
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full scroll-smooth antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {/* Without JavaScript nothing would ever reveal, so show it all. */}
        <noscript>
          <style>{`.reveal{opacity:1;transform:none}`}</style>
        </noscript>
        <SiteProvider site={site}>{children}</SiteProvider>
      </body>
    </html>
  );
}
