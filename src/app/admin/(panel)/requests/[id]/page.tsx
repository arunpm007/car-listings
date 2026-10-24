import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";
import { RequestActions } from "@/components/admin/RequestActions";
import { getSellRequest, requestTitle } from "@/lib/admin-data";
import { formatDate, formatKm, formatPrice, fuelLabel, transmissionLabel } from "@/lib/format";
import { waNumber } from "@/lib/phone";
import { photoUrl } from "@/lib/supabase/env";
import { whatsappHref } from "@/lib/contact";
import { requireAdmin } from "@/lib/supabase/server";

export const metadata = { title: "Sell request" };

export default async function RequestPage({ params }: PageProps<"/admin/requests/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const request = await getSellRequest(id);
  if (!request) notFound();

  const title = requestTitle(request);
  const details: [string, string | null][] = [
    ["Year", request.year ? String(request.year) : null],
    ["Km driven", request.km_driven != null ? formatKm(request.km_driven) : null],
    ["Fuel", request.fuel ? fuelLabel[request.fuel] : null],
    ["Gearbox", request.transmission ? transmissionLabel[request.transmission] : null],
    ["Expects", request.expected_price ? formatPrice(request.expected_price) : null],
    ["Car is at", request.location],
  ];

  return (
    <>
      <Link href="/admin?tab=submitted" className="text-sm text-muted hover:text-foreground">
        ← Sell requests
      </Link>
      <div className="mt-2 flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-muted">
            {request.code} · sent {formatDate(request.created_at)}
          </p>
          <h1 className="text-2xl font-bold">{title}</h1>
          {(request.brand_text || request.model_text) && (
            <p className="mt-1 text-sm text-amber-800">Typed by the seller — not in your catalogue yet.</p>
          )}
        </div>
        {request.status === "converted" && request.car_id ? (
          <Link href={`/admin/cars/${request.car_id}`} className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
            Open the listing <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : (
          request.status !== "rejected" && (
            <Link
              href={`/admin/cars/new?request=${request.id}`}
              className="inline-flex h-10 items-center gap-1 rounded-lg bg-accent px-4 font-semibold text-accent-ink"
            >
              Create listing <ArrowRight className="size-4" aria-hidden />
            </Link>
          )
        )}
      </div>

      <section className="mt-6 rounded-xl border border-line bg-surface p-5">
        <h2 className="font-semibold">Seller</h2>
        <p className="mt-1">
          {request.seller_name} · <span className="font-mono">{request.seller_phone}</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={`tel:${request.seller_phone}`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-semibold text-white">
            <Phone className="size-4" aria-hidden /> Call seller
          </a>
          <a
            href={whatsappHref(`Hi ${request.seller_name}, this is about your ${title} (${request.code}).`, waNumber(request.seller_phone))}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-whatsapp px-4 text-sm font-semibold text-white"
          >
            <MessageCircle className="size-4" aria-hidden /> WhatsApp seller
          </a>
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-line bg-surface p-5">
        <h2 className="font-semibold">Car</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="font-medium">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
        {request.notes && <p className="mt-4 whitespace-pre-line text-sm text-muted">{request.notes}</p>}
      </section>

      <section className="mt-4 rounded-xl border border-line bg-surface p-5">
        <h2 className="font-semibold">Photos</h2>
        {request.photos.length ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {request.photos.map((p) => (
              <a key={p.full_path} href={p.full_url ?? photoUrl(p.full_path)} target="_blank" rel="noopener noreferrer" className="aspect-[4/3] overflow-hidden rounded-lg bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb_url ?? photoUrl(p.thumb_path)} alt="" className="size-full object-cover" />
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">No photos sent. Ask for them on WhatsApp.</p>
        )}
      </section>

      <div className="mt-6">
        <RequestActions id={request.id} status={request.status} />
      </div>
    </>
  );
}
