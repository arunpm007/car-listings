"use client";

import { MessageCircle, Phone } from "lucide-react";
import clsx from "clsx";
import { telHref, whatsappHref } from "@/lib/contact";
import { useSite } from "./SiteProvider";
import { TrackedLink } from "./TrackedLink";

type Props = {
  message: string;
  /** Count taps against this car. */
  carId?: number;
  size?: "md" | "lg";
  className?: string;
};

export function ContactButtons({ message, carId, size = "md", className }: Props) {
  const site = useSite();
  const pad = size === "lg" ? "h-12 text-base" : "h-10 text-sm";
  return (
    <div className={clsx("grid grid-cols-2 gap-2", className)}>
      <TrackedLink
        carId={carId}
        channel="call"
        href={telHref(site.phone)}
        className={clsx(pad, "inline-flex items-center justify-center gap-2 rounded-lg bg-foreground font-semibold text-white hover:opacity-90")}
      >
        <Phone className="size-4" aria-hidden /> Call
      </TrackedLink>
      <TrackedLink
        carId={carId}
        channel="whatsapp"
        href={whatsappHref(message, site.whatsapp)}
        target="_blank"
        rel="noopener noreferrer"
        className={clsx(pad, "inline-flex items-center justify-center gap-2 rounded-lg bg-whatsapp font-semibold text-white hover:opacity-90")}
      >
        <MessageCircle className="size-4" aria-hidden /> WhatsApp
      </TrackedLink>
    </div>
  );
}
