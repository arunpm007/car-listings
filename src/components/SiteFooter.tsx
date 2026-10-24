import Link from "next/link";
import { ArrowUpRight, Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import { getSite } from "@/lib/settings";
import { telHref, whatsappHref } from "@/lib/contact";

export async function SiteFooter() {
  const site = await getSite();
  return (
    <footer className="mt-24 bg-night text-white">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="font-display text-2xl font-bold">{site.name}</p>
            <p className="mt-3 max-w-sm text-white/60">{site.tagline}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <a
                href={telHref(site.phone)}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-night transition hover:-translate-y-0.5"
              >
                <Phone className="size-4" aria-hidden /> {site.phone}
              </a>
              <a
                href={whatsappHref("Hi, I found you on your website.", site.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-whatsapp px-4 text-sm font-semibold transition hover:-translate-y-0.5"
              >
                <MessageCircle className="size-4" aria-hidden /> WhatsApp
              </a>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Explore</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                ["/cars", "Cars for sale"],
                ["/sell", "Sell your car"],
                ["/sold", "Recently sold"],
                ["/contact", "Contact"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="group inline-flex items-center gap-1 text-white/80 transition hover:text-white">
                    {label}
                    <ArrowUpRight className="size-3.5 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">{site.address ? "Visit" : "Hours"}</p>
            {site.address && (
              <p className="flex gap-2 text-white/80">
                <MapPin className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                <span>
                  {site.address}
                  {site.mapUrl && (
                    <>
                      <br />
                      <a href={site.mapUrl} target="_blank" rel="noopener noreferrer" className="text-white underline-offset-4 hover:underline">
                        Open in Google Maps
                      </a>
                    </>
                  )}
                </span>
              </p>
            )}
            <p className="flex gap-2 text-white/80">
              <Clock className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden /> {site.hours}
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40">
          <p>Cars are listed on behalf of their owners. Please inspect the car and its papers before you pay.</p>
          <p>
            <Link href="/credits" className="hover:text-white">
              Photo credits
            </Link>
            {" · "}
            <Link href="/admin" className="hover:text-white">
              Admin
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
