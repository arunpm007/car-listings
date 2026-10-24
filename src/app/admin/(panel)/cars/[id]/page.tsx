import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { CarForm } from "@/components/admin/CarForm";
import { DeleteCarButton } from "@/components/admin/DeleteCarButton";
import { StatusActions } from "@/components/admin/StatusActions";
import { Visibility } from "@/components/admin/Visibility";
import { DealPanel } from "@/components/admin/DealPanel";
import { PapersPanel } from "@/components/admin/PapersPanel";
import { getSite } from "@/lib/settings";
import { WAITING_LEAD_STATUSES, getInterest, getLeads } from "@/lib/admin-data";
import { StatusBadge } from "@/components/StatusBadge";
import { getCarForAdmin, getCatalog } from "@/lib/cars";
import { carPath, carTitle } from "@/lib/car-url";
import { formatDate } from "@/lib/format";
import { createClient, requireAdmin } from "@/lib/supabase/server";
import { DELETABLE_STATUSES, REMOVED_REASON_LABEL, isPublicStatus, type CarDocument, type CarPrivate } from "@/lib/types";

export default async function EditCarPage({ params }: PageProps<"/admin/cars/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();

  const supabase = await createClient();
  const [car, catalog, privateRow, leads, interest, documents, site] = await Promise.all([
    getCarForAdmin(id),
    getCatalog(),
    supabase.from("car_private").select("*").eq("car_id", id).maybeSingle(),
    getLeads({ carId: id }),
    getInterest(),
    supabase.from("car_documents").select("*").eq("car_id", id).order("created_at"),
    getSite(),
  ]);
  if (!car) notFound();

  // The line: open buyers other than the one in the deal, in the order they called.
  const dealLeadId = (privateRow.data as CarPrivate | null)?.deal_lead_id ?? null;
  const dealLead = leads.find((l) => l.id === dealLeadId) ?? null;
  const waiting = leads
    .filter((l) => l.id !== dealLeadId && WAITING_LEAD_STATUSES.includes(l.status))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const past = leads.filter((l) => l.status === "bought" || l.status === "lost");
  const isPublic = isPublicStatus(car.status);
  const priv = privateRow.data as CarPrivate | null;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-muted">{car.code}</p>
          <h1 className="text-2xl font-bold">{carTitle(car)}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={car.status} />
            <Visibility status={car.status} />
          </div>
        </div>
        {isPublic && (
          <Link href={carPath(car)} target="_blank" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
            Public page <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        )}
        {DELETABLE_STATUSES.includes(car.status) && <DeleteCarButton id={car.id} />}
      </div>
      <div className="-mt-3 mb-6">
        <StatusActions id={car.id} status={car.status} title={carTitle(car)} />
      </div>
      {car.status === "archived" && (
        <div className="mb-8 rounded-xl border border-line bg-stone-50 p-4 text-sm">
          <p className="font-semibold">
            Off the website{priv?.removed_reason ? `: ${REMOVED_REASON_LABEL[priv.removed_reason].toLowerCase()}` : ""}
            {priv?.removed_at && <span className="font-normal text-muted"> · {formatDate(priv.removed_at)}</span>}
          </p>
          {priv?.removed_note && <p className="mt-1 whitespace-pre-line text-muted">{priv.removed_note}</p>}
          <p className="mt-2 text-xs text-muted">Kept for your records. Publish again to put it back on sale, or delete it for good. Private paper copies are cleared 30 days after removal.</p>
        </div>
      )}
      <div className="mb-10">
        <DealPanel
          carId={car.id}
          carTitle={carTitle(car)}
          status={car.status}
          deal={privateRow.data ? { lead: dealLead, token: privateRow.data.deal_token, startedAt: privateRow.data.deal_started_at } : null}
          waiting={waiting}
          past={past}
        />
        <p className="mt-3 text-xs text-muted">
          Website taps in the last 30 days: {interest.get(car.id)?.calls ?? 0} calls · {interest.get(car.id)?.whatsapps ?? 0} WhatsApp
        </p>
      </div>

      <div className="mb-10">
        <PapersPanel
          carId={car.id}
          businessName={site.name}
          papers={{
            papers_rc_seen: car.papers_rc_seen,
            papers_insurance: car.papers_insurance,
            papers_puc: car.papers_puc,
            papers_service_records: car.papers_service_records,
            papers_loan: car.papers_loan,
          }}
          consent={Boolean((privateRow.data as CarPrivate | null)?.docs_consent)}
          documents={(documents.data ?? []) as CarDocument[]}
        />
      </div>

      <h2 className="mb-4 text-xl font-bold">Car details</h2>
      <CarForm
        key={car.updated_at}
        brands={catalog.brands}
        models={catalog.models}
        car={car}
        photos={car.photos}
        privateDetails={privateRow.data as CarPrivate | null}
      />

    </>
  );
}
