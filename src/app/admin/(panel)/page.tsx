import Link from "next/link";
import { Car as CarIcon, Handshake, MessageCircle, Phone, Users } from "lucide-react";
import clsx from "clsx";
import { RequestRow } from "@/components/admin/RequestRow";
import { StatusActions } from "@/components/admin/StatusActions";
import { SavedNotice } from "@/components/admin/SavedNotice";
import { Visibility } from "@/components/admin/Visibility";
import { carPath } from "@/lib/car-url";
import { StatusBadge } from "@/components/StatusBadge";
import { getDealSummaries, getInterest, getRemovedReasons, getSellRequests, type DealSummary } from "@/lib/admin-data";
import { getAllCarsForAdmin } from "@/lib/cars";
import { formatDate, formatKm, formatPrice, formatPriceShort } from "@/lib/format";
import { photoUrl } from "@/lib/supabase/env";
import { REMOVED_REASON_LABEL, STATUSES, isPublicStatus, type CarStatus } from "@/lib/types";
import { requireAdmin } from "@/lib/supabase/server";

const TABS: { key: CarStatus | "active"; label: string }[] = [
  { key: "active", label: "On sale & in deal" },
  { key: "verified", label: "Ready to publish" },
  { key: "submitted", label: "Sell requests" },
  { key: "sold", label: "Sold" },
  { key: "archived", label: "Removed" },
];

export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();
  const sp = await searchParams;
  const raw = sp.tab;
  const savedId = Number(sp.saved) || null;
  const tab = TABS.find((t) => t.key === raw)?.key ?? "active";
  const [all, openRequests, interest, deals, removed] = await Promise.all([
    getAllCarsForAdmin(),
    getSellRequests(["new", "contacted"]),
    getInterest(),
    getDealSummaries(),
    tab === "archived" ? getRemovedReasons() : null,
  ]);

  const counts = Object.fromEntries(STATUSES.map((s) => [s, all.filter((c) => c.status === s).length])) as Record<CarStatus, number>;
  const countFor = (key: (typeof TABS)[number]["key"]) => (key === "active" ? counts.listed + counts.reserved : key === "submitted" ? counts.submitted + openRequests.length : counts[key]);
  const cars = all.filter((c) => (tab === "active" ? c.status === "listed" || c.status === "reserved" : c.status === tab));

  const savedCar = savedId ? all.find((c) => c.id === savedId) : undefined;

  return (
    <>
      {savedCar && (
        <SavedNotice
          key={savedCar.id}
          title={`${savedCar.brand.name} ${savedCar.model.name}`}
          code={savedCar.code}
          live={isPublicStatus(savedCar.status)}
          added={sp.added === "1"}
          carId={savedCar.id}
          editHref={`/admin/cars/${savedCar.id}`}
          publicHref={carPath(savedCar)}
        />
      )}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="On sale" value={counts.listed} />
        <Stat label="In deal" value={counts.reserved} />
        <Stat label="Sold" value={counts.sold} />
      </div>

      <nav className="no-scrollbar -mx-4 mt-6 flex gap-1 overflow-x-auto border-b border-line px-4">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "active" ? "/admin" : `/admin?tab=${t.key}`}
            className={clsx(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium",
              tab === t.key ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {t.label} <span className="text-muted">{countFor(t.key)}</span>
          </Link>
        ))}
      </nav>

      {tab === "submitted" && openRequests.length > 0 && (
        <>
          <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted">From the sell form</h2>
          <ul className="mt-2 divide-y divide-line rounded-xl border border-line bg-surface">
            {openRequests.map((r) => (
              <RequestRow key={r.id} request={r} />
            ))}
          </ul>
          {cars.length > 0 && <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-muted">Cars not checked yet (hidden)</h2>}
        </>
      )}

      {cars.length === 0 ? (
        tab === "submitted" && openRequests.length > 0 ? null : (
        <p className="mt-8 rounded-xl border border-dashed border-line p-10 text-center text-muted">
          Nothing here.{" "}
          <Link href="/admin/cars/new" className="font-semibold text-accent hover:underline">
            Add a car
          </Link>
        </p>
        )
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
          {cars.map((car) => (
            <li key={car.id} className={clsx("flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap", car.id === savedId && "row-flash")}>
              <Link href={`/admin/cars/${car.id}`} className="flex w-full min-w-0 items-center gap-3 sm:w-auto sm:flex-1">
                <div className="size-16 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                  {car.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl(car.photos[0].thumb_path)} alt="" className="size-full object-cover" />
                  ) : (
                    <CarIcon className="m-auto mt-4 size-8 text-zinc-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {car.year} {car.brand.name} {car.model.name} {car.variant}
                  </p>
                  <p className="text-xs text-muted">
                    <span className="font-mono">{car.code}</span> · {formatPriceShort(car.price)} · {formatKm(car.km_driven)} ·{" "}
                    {car.photos.length} photos
                  </p>
                  <Interest counts={interest.get(car.id)} />
                  <DealLine status={car.status} deal={deals.get(car.id)} />
                  {car.status === "archived" && <RemovedLine removed={removed?.get(car.id)} soldAt={car.sold_at} />}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={car.status} />
                    <Visibility status={car.status} />
                    {car.status !== "sold" && car.status !== "archived" && (
                      <span className={clsx("rounded px-1.5 py-0.5 text-[11px] font-semibold", car.with_us ? "bg-emerald-50 text-emerald-800" : "bg-stone-100 text-stone-700")}>
                        {car.with_us ? "With us" : "With owner"}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              <StatusActions id={car.id} status={car.status} title={`${car.year} ${car.brand.name} ${car.model.name}`} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Why a removed car came off the website. Cars hidden from Recently sold have no reason, just a sale date. */
function RemovedLine({ removed, soldAt }: { soldAt: string | null; removed?: { removed_reason: keyof typeof REMOVED_REASON_LABEL | null; removed_note: string | null; removed_at: string | null } }) {
  if (!removed?.removed_reason) {
    return <p className="mt-1 text-xs text-muted">{soldAt ? `Sold through us ${formatDate(soldAt)}, hidden from Recently sold` : "Taken off the website"}</p>;
  }
  return (
    <p className="mt-1 text-xs text-muted">
      <span className="font-medium text-foreground">{REMOVED_REASON_LABEL[removed.removed_reason]}</span>
      {removed.removed_at && ` · ${formatDate(removed.removed_at)}`}
      {removed.removed_note && ` · ${removed.removed_note}`}
    </p>
  );
}

/** Who an In-deal car is with, and how many buyers are waiting behind them. */
function DealLine({ status, deal }: { status: CarStatus; deal?: DealSummary }) {
  if (status === "reserved") {
    return (
      <p className="mt-1 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">
        <Handshake className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
        {deal?.leadId ? (
          <>
            With <strong>{deal.buyer || deal.phone || "buyer"}</strong>
            {deal.token ? ` · token ${formatPrice(deal.token)}` : ""}
          </>
        ) : (
          "Buyer not recorded yet — open the deal to add them"
        )}
        {deal?.waiting ? ` · ${deal.waiting} waiting` : ""}
      </p>
    );
  }
  if (deal?.waiting && (status === "listed" || status === "verified")) {
    return (
      <p className="mt-1 text-xs font-medium text-amber-800">
        <Users className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />
        {deal.waiting} {deal.waiting === 1 ? "buyer" : "buyers"} interested
      </p>
    );
  }
  return null;
}

function Interest({ counts }: { counts?: { calls: number; whatsapps: number } }) {
  if (!counts) return null;
  return (
    <p className="mt-0.5 inline-flex items-center gap-2 text-xs text-muted" title="Taps on the car page in the last 30 days">
      <span className="inline-flex items-center gap-0.5">
        <Phone className="size-3" aria-hidden /> {counts.calls}
      </span>
      <span className="inline-flex items-center gap-0.5">
        <MessageCircle className="size-3" aria-hidden /> {counts.whatsapps}
      </span>
      <span>in 30 days</span>
    </p>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
