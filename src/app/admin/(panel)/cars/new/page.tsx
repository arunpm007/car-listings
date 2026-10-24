import Link from "next/link";
import { CarForm, NEW_OPTION, type FormState } from "@/components/admin/CarForm";
import { getSellRequest } from "@/lib/admin-data";
import { getCatalog } from "@/lib/cars";
import type { SellRequest } from "@/lib/types";
import { requireAdmin } from "@/lib/supabase/server";

export default async function NewCarPage({ searchParams }: PageProps<"/admin/cars/new">) {
  await requireAdmin();
  const requestId = Number((await searchParams).request);
  const [{ brands, models }, request] = await Promise.all([
    getCatalog(),
    Number.isSafeInteger(requestId) && requestId > 0 ? getSellRequest(requestId) : null,
  ]);
  const usable = request && request.status !== "converted" ? request : null;

  return (
    <>
      <h1 className="text-2xl font-bold">Add a car</h1>
      {usable ? (
        <p className="mb-6 mt-1 text-sm text-muted">
          Filled in from{" "}
          <Link href={`/admin/requests/${usable.id}`} className="font-mono text-accent hover:underline">
            {usable.code}
          </Link>
          . Check the details after your visit, then save.
        </p>
      ) : (
        <div className="mb-6" />
      )}
      <CarForm
        brands={brands}
        models={models}
        photos={usable?.photos}
        prefill={usable ? prefillFrom(usable) : undefined}
        fromRequestId={usable?.id}
      />
    </>
  );
}

/** Turns what the owner sent into starting values. Typed brand/model become "not in the list" entries. */
function prefillFrom(r: SellRequest): Partial<FormState> {
  const typedBrand = !r.brand_id && r.brand_text;
  const typedModel = !r.model_id && r.model_text;
  return {
    brand_id: typedBrand ? NEW_OPTION : String(r.brand_id ?? ""),
    new_brand: typedBrand ? r.brand_text! : "",
    model_id: typedBrand || typedModel ? NEW_OPTION : String(r.model_id ?? ""),
    new_model: typedBrand || typedModel ? (r.model_text ?? "") : "",
    variant: r.variant ?? "",
    year: r.year ? String(r.year) : "",
    ...(r.fuel ? { fuel: r.fuel } : {}),
    ...(r.transmission ? { transmission: r.transmission } : {}),
    km_driven: r.km_driven != null ? String(r.km_driven) : "",
    price: r.expected_price ? String(r.expected_price) : "",
    location: r.location ?? "",
    seller_name: r.seller_name,
    seller_phone: r.seller_phone,
    seller_min_price: "",
    notes: [`From ${r.code}.`, r.expected_price ? `Owner expected ₹${r.expected_price}.` : null, r.notes].filter(Boolean).join(" "),
  };
}
