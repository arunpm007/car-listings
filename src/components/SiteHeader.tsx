"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, MessageCircle, Phone, X } from "lucide-react";
import clsx from "clsx";
import { useSite } from "./SiteProvider";
import { telHref, whatsappHref } from "@/lib/contact";

const DARK_HERO = ["/", "/cars", "/sold", "/sell", "/contact", "/credits", "/privacy"];

const NAV = [
  { href: "/cars", label: "Buy a car" },
  { href: "/sell", label: "Sell your car" },
  { href: "/sold", label: "Recently sold" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const site = useSite();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  // Remember which page the menu was opened on, so it closes by itself after navigating.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  // These pages open on a dark hero, so the header starts see-through with light text.
  const darkTop = DARK_HERO.includes(pathname);
  const overHero = darkTop && !scrolled && !open;

  // Hold the page still behind the open phone menu.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={clsx(
        "fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,color] duration-300",
        // No backdrop blur while the menu is open: blur would make the fixed menu position itself inside the header.
        open
          ? "bg-surface text-foreground shadow-[0_1px_0_var(--line)]"
          : overHero
            ? "bg-transparent text-white"
            : "bg-surface/85 text-foreground shadow-[0_1px_0_var(--line)] backdrop-blur-xl",
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 md:h-16 md:gap-3">
        <Link href="/" className="min-w-0 truncate font-display text-lg font-bold tracking-tight sm:text-xl">
          <Wordmark name={site.name} />
        </Link>

        <nav className="ml-auto hidden items-center gap-1 text-sm font-medium md:flex">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "relative rounded-full px-3 py-1.5 transition-colors",
                  overHero ? "hover:bg-white/10" : "hover:bg-black/5",
                  active && (overHero ? "bg-white/15" : "bg-black/[0.06]"),
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <a
          href={telHref(site.phone)}
          aria-label={`Call ${site.phone}`}
          className="ml-auto grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-ink shadow-lg shadow-accent/25 transition hover:-translate-y-0.5 hover:bg-accent-deep md:ml-2 md:flex md:h-10 md:w-auto md:gap-2 md:px-4 md:text-sm md:font-semibold"
        >
          <Phone className="size-4" aria-hidden />
          <span className="hidden lg:inline">{site.phone}</span>
          <span className="hidden md:inline lg:hidden">Call</span>
        </a>
        <button
          type="button"
          onClick={() => setOpenOn(open ? null : pathname)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className={clsx("grid size-10 place-items-center rounded-full md:hidden", overHero ? "hover:bg-white/10" : "hover:bg-black/5")}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Phone menu: fills the screen under the bar. */}
      <div
        className={clsx(
          "fixed inset-x-0 bottom-0 top-14 flex flex-col bg-surface text-foreground transition duration-300 md:hidden",
          open ? "visible opacity-100" : "invisible -translate-y-2 opacity-0",
        )}
      >
        <nav className="flex-1 overflow-y-auto px-4 pt-4">
          <ul className="space-y-1">
            {NAV.map((item, i) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li
                  key={item.href}
                  className={clsx("transition duration-300", open ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0")}
                  style={{ transitionDelay: open ? `${60 + i * 40}ms` : "0ms" }}
                >
                  <Link
                    href={item.href}
                    className={clsx(
                      "flex items-center justify-between rounded-2xl px-4 py-4 font-display text-2xl font-semibold",
                      active ? "bg-accent/10 text-accent" : "hover:bg-black/5",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="grid grid-cols-2 gap-2 border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <a href={telHref(site.phone)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-foreground font-semibold text-white">
            <Phone className="size-4" aria-hidden /> Call
          </a>
          <a
            href={whatsappHref("Hi, I found you on your website.", site.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-whatsapp font-semibold text-white"
          >
            <MessageCircle className="size-4" aria-hidden /> WhatsApp
          </a>
        </div>
      </div>
    </header>
  );
}

/** The business name with its last word in the accent colour. */
function Wordmark({ name }: { name: string }) {
  const i = name.lastIndexOf(" ");
  if (i < 0) return <>{name}</>;
  return (
    <>
      {name.slice(0, i)} <span className="text-accent">{name.slice(i + 1)}</span>
    </>
  );
}
