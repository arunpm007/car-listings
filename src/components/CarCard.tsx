import Link from "next/link";
import { ViewTransition } from "react";
import { ArrowUpRight, CalendarDays, Car as CarIcon, Fuel, Gauge, Images, MapPin, Settings2 } from "lucide-react";
import clsx from "clsx";
import { CategoryIcon } from "@/components/CategoryIcon";
import { WhereTag } from "@/components/WhereTag";
import { carPath, carTitle } from "@/lib/car-url";
import { categoryLabel, formatDate, formatKm, formatPriceShort, fuelLabel, transmissionLabel } from "@/lib/format";
import { photoUrl } from "@/lib/supabase/env";
import type { CarWithRelations } from "@/lib/types";

type Props = {
  car: CarWithRelations;
  priority?: boolean;
  /** On phones, show a short side-by-side row instead of the tall card, so more cars fit on screen. */
  compact?: boolean;
};

export function CarCard({ car, priority = false, compact = false }: Props) {
  const cover = car.photos[0];
  const sold = car.status === "sold";
  const inDeal = car.status === "reserved";
  // Classes that only apply to the phone row; from `sm` up every card is the full card.
  const row = (phone: string, full = "") => (compact ? clsx(phone, full) : full);

  return (
    <Link
      href={carPath(car)}
      className={clsx(
        "group relative flex h-full overflow-hidden border border-line bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_24px_48px_-20px_rgb(18_20_26/0.28)]",
        row("flex-row rounded-2xl sm:flex-col sm:rounded-3xl", "flex-col rounded-3xl"),
      )}
    >
      <div className={clsx("relative overflow-hidden bg-zinc-100", row("min-h-28 w-[40%] shrink-0 sm:aspect-[4/3] sm:min-h-0 sm:w-auto", "aspect-[4/3]"))}>
        <ViewTransition name={`car-photo-${car.id}`} share="morph" default="none">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- photos are resized on upload
            <img
              src={photoUrl(cover.thumb_path)}
              alt={carTitle(car)}
              loading={priority ? "eager" : "lazy"}
              className={clsx(
                "size-full object-cover transition duration-700 ease-out group-hover:scale-[1.06]",
                compact && "absolute inset-0 sm:static",
                sold && "grayscale-[60%]",
              )}
            />
          ) : (
            <div
              className={clsx(
                "flex size-full flex-col items-center justify-center gap-2 bg-[#e8e4da] text-foreground/35",
                compact && "absolute inset-0 sm:static",
              )}
            >
              {car.model.category ? (
                <CategoryIcon category={car.model.category} className={row("h-8 w-20 sm:h-12 sm:w-28", "h-12 w-28")} />
              ) : (
                <CarIcon className={row("size-8 sm:size-12", "size-12")} aria-hidden />
              )}
              <span className={clsx("text-xs font-medium text-foreground/55", compact && "hidden sm:inline")}>Photo coming soon</span>
            </div>
          )}
        </ViewTransition>
        <div className={clsx("pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent", compact && "hidden sm:block")} />

        <div className={clsx("absolute flex gap-1.5", row("left-2 top-2 sm:left-3 sm:top-3", "left-3 top-3"))}>
          {car.featured && !sold && (
            <Chip hideOnPhone={compact} className="bg-accent text-white shadow-md">
              Featured
            </Chip>
          )}
          {inDeal && <Chip className="bg-amber-500/90 text-white">In deal</Chip>}
        </div>
        {car.photos.length > 1 && (
          <Chip hideOnPhone={compact} className="absolute right-3 top-3 bg-black/40 text-white">
            <Images className="size-3" aria-hidden /> {car.photos.length}
          </Chip>
        )}
        {car.area && (
          <span className={clsx("absolute bottom-3 left-3 items-center gap-1 text-xs font-medium text-white", compact ? "hidden sm:inline-flex" : "inline-flex")}>
            <MapPin className="size-3.5" aria-hidden /> {car.area}
          </span>
        )}
        {sold && (
          <span
            className={clsx(
              "stamp absolute top-1/2 -translate-y-1/2 rounded-lg bg-foreground font-display font-extrabold uppercase tracking-widest text-white shadow-[0_8px_24px_-8px_rgb(0_0_0/0.6)] ring-2 ring-white/90",
              row("left-1/2 -translate-x-1/2 px-2.5 py-1 text-sm sm:px-4 sm:py-1.5 sm:text-xl", "left-1/2 -translate-x-1/2 px-4 py-1.5 text-xl"),
            )}
          >
            Sold
          </span>
        )}
      </div>

      <div className={clsx("flex min-w-0 flex-1 flex-col", row("p-3 sm:p-5", "p-5"))}>
        <h3 className={clsx("font-display font-semibold leading-tight", row("text-base sm:text-lg", "text-lg"))}>
          {car.brand.name} {car.model.name}
        </h3>
        <p className={clsx("mt-0.5 text-muted", row("truncate text-xs sm:text-sm", "text-sm"))}>
          {[car.model.category && categoryLabel[car.model.category].name, car.year, car.variant].filter(Boolean).join(" · ")}
        </p>

        {!sold && <WhereTag withUs={car.with_us} className={row("mt-1.5 sm:mt-2", "mt-2")} />}
        {compact && (
          <p className="mt-1.5 truncate text-xs text-muted sm:hidden">
            {formatKm(car.km_driven)} · {fuelLabel[car.fuel]} · {transmissionLabel[car.transmission]}
          </p>
        )}
        <ul className={clsx("mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-muted", compact && "hidden sm:grid")}>
          <Spec icon={Gauge}>{formatKm(car.km_driven)}</Spec>
          <Spec icon={Fuel}>{fuelLabel[car.fuel]}</Spec>
          <Spec icon={Settings2}>{transmissionLabel[car.transmission]}</Spec>
          <Spec icon={CalendarDays}>{car.owners === 1 ? "1st owner" : `${car.owners} owners`}</Spec>
        </ul>

        <div className={clsx("mt-auto flex items-end justify-between gap-3", row("pt-2 sm:pt-5", "pt-5"))}>
          {sold ? (
            <p className="text-sm font-medium text-muted">Sold {car.sold_at ? formatDate(car.sold_at) : ""}</p>
          ) : (
            <div className={clsx(compact && "flex flex-wrap items-center gap-x-2 gap-y-1 sm:block")}>
              <p className={clsx("whitespace-nowrap font-display font-bold leading-none", row("text-lg sm:text-2xl", "text-2xl"))}>{formatPriceShort(car.price)}</p>
              {car.negotiable ? (
                <span className={clsx("inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700", row("sm:mt-1.5", "mt-1.5"))}>
                  Negotiable
                </span>
              ) : (
                <p className={clsx("text-xs text-muted", row("sm:mt-1", "mt-1"))}>Fixed price</p>
              )}
            </div>
          )}
          <span
            className={clsx(
              "size-10 shrink-0 place-items-center rounded-full bg-foreground text-white transition duration-300 group-hover:rotate-45 group-hover:bg-accent",
              compact ? "hidden sm:grid" : "grid",
            )}
          >
            <ArrowUpRight className="size-4" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

function Chip({ className, hideOnPhone = false, children }: { className?: string; hideOnPhone?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        hideOnPhone ? "hidden sm:inline-flex" : "inline-flex",
        "items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md",
        className,
      )}
    >
      {children}
    </span>
  );
}

function Spec({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <Icon className="size-3.5 shrink-0 text-foreground/50" />
      <span className="truncate">{children}</span>
    </li>
  );
}
