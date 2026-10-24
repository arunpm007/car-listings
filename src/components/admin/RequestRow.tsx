import Link from "next/link";
import { Car as CarIcon, Images } from "lucide-react";
import clsx from "clsx";
import { requestTitle } from "@/lib/admin-data";
import { formatDate, formatKm, formatPriceShort } from "@/lib/format";
import { photoUrl } from "@/lib/supabase/env";
import type { SellRequest } from "@/lib/types";

const statusStyle = {
  new: "bg-sky-100 text-sky-800",
  contacted: "bg-indigo-100 text-indigo-800",
  converted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-zinc-200 text-zinc-700",
} as const;

export function RequestRow({ request }: { request: SellRequest }) {
  const cover = request.photos[0];
  return (
    <li>
      <Link href={`/admin/requests/${request.id}`} className="flex items-center gap-3 p-3 hover:bg-zinc-50">
        <div className="size-16 shrink-0 overflow-hidden rounded-md bg-zinc-100">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.thumb_url ?? photoUrl(cover.thumb_path)} alt="" className="size-full object-cover" />
          ) : (
            <CarIcon className="m-auto mt-4 size-8 text-zinc-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{requestTitle(request)}</p>
          <p className="text-xs text-muted">
            <span className="font-mono">{request.code}</span> · {request.seller_name} · {formatDate(request.created_at)}
          </p>
          <p className="text-xs text-muted">
            {[
              request.expected_price ? `wants ${formatPriceShort(request.expected_price)}` : null,
              request.km_driven != null ? formatKm(request.km_driven) : null,
              request.location,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <span className="mt-1 inline-flex items-center gap-2">
            <span className={clsx("rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide", statusStyle[request.status])}>
              {request.status}
            </span>
            {request.photos.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <Images className="size-3.5" aria-hidden /> {request.photos.length}
              </span>
            )}
          </span>
        </div>
      </Link>
    </li>
  );
}
