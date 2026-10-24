"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeIndianPhone, prettyPhone, waNumber } from "@/lib/phone";
import { PHOTO_BUCKET, REQUEST_PHOTO_BUCKET } from "@/lib/supabase/env";
import { createClient, getAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  CATEGORIES,
  FUELS,
  LEAD_SOURCES,
  LEAD_STATUSES,
  REQUEST_STATUSES,
  REMOVED_REASONS,
  REMOVED_REASON_LABEL,
  DOCUMENT_KINDS,
  STATUSES,
  TRANSMISSIONS,
  DELETABLE_STATUSES,
  type CarStatus,
  type PhotoRef,
  type RemovedReason,
  type RequestStatus,
} from "@/lib/types";

/** Every admin action starts here: signed in, on the admins list, and through two-step login. */
async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (!admin.mfa) redirect("/admin/mfa");
  return admin;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

const optionalText = z
  .string()
  .trim()
  .max(2000)
  .transform((v) => v || null)
  .nullable()
  .optional();

const optionalInt = z.coerce
  .number()
  .int()
  .nonnegative()
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

const photoSchema = z.object({
  full_path: z.string().min(1),
  thumb_path: z.string().min(1),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  credit: z.string().max(300).nullable().optional(),
  bucket: z.literal(REQUEST_PHOTO_BUCKET).optional(),
});

const carSchema = z
  .object({
    brand_id: z.coerce.number().int().positive().nullable(),
    new_brand: optionalText,
    model_id: z.coerce.number().int().positive().nullable(),
    new_model: optionalText,
    variant: optionalText,
    year: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 1),
    fuel: z.enum(FUELS),
    transmission: z.enum(TRANSMISSIONS),
    // Saved on the model, so every car of that model gets it. Only sent when the model has none yet.
    model_category: z.enum(CATEGORIES).nullable().optional(),
    km_driven: z.coerce.number().int().nonnegative(),
    owners: z.coerce.number().int().min(1).max(10),
    color: optionalText,
    rto: optionalText,
    insurance_valid_until: optionalText,
    price: z.coerce.number().int().positive(),
    negotiable: z.boolean(),
    location: optionalText,
    description: optionalText,
    featured: z.boolean(),
    // Optional so a form page opened before this field existed can still save.
    with_us: z.boolean().optional(),
    private: z.object({
      seller_name: optionalText,
      seller_phone: optionalText,
      reg_number: optionalText,
      seller_min_price: optionalInt,
      commission: optionalInt,
      notes: optionalText,
    }),
    photos: z.array(photoSchema).max(30),
  })
  .refine((v) => v.brand_id || v.new_brand, { message: "Pick a brand", path: ["brand_id"] })
  .refine((v) => v.model_id || v.new_model, { message: "Pick a model", path: ["model_id"] });

export type CarInput = z.input<typeof carSchema>;

const FIELD_LABELS: Record<string, string> = {
  brand_id: "Brand",
  model_id: "Model",
  new_brand: "Brand name",
  new_model: "Model name",
  year: "Year",
  fuel: "Fuel",
  transmission: "Gearbox",
  km_driven: "Km driven",
  owners: "Owners",
  price: "Asking price",
  insurance_valid_until: "Insurance valid until",
  description: "Description",
};

/** Turns validation errors into something a person can act on, instead of "expected number, received undefined". */
function friendlyError(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return "Check the form and try again.";
  // Our own messages ("Pick a brand") are already plain.
  if (issue.code === "custom") return issue.message;
  if (issue.message.includes("received undefined")) {
    return "This page is out of date. Reload it and try again.";
  }
  const field = FIELD_LABELS[String(issue.path[0])] ?? (issue.path[0] === "private" ? "Owner details" : "A field");
  if (issue.code === "too_small" || issue.code === "too_big") return `${field} is out of range. Check the number.`;
  return `${field} doesn't look right. Check it and try again.`;
}
export type SaveResult = { ok: false; error: string } | { ok: true; id: number };

export async function saveCar(id: number | null, input: CarInput, fromRequestId?: number): Promise<SaveResult> {
  await requireAdmin();
  const parsed = carSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: friendlyError(parsed.error) };
  }
  // The area lives with the private details: it hints at where the owner is.
  const { new_brand, new_model, model_category, location, private: privateFields, photos, ...fields } = parsed.data;
  const supabase = await createClient();

  // A brand or model the catalogue doesn't have yet gets added, so it is in the list next time.
  let brandId = fields.brand_id;
  if (!brandId && new_brand) {
    const slug = slugify(new_brand);
    const { data, error } = await supabase
      .from("brands")
      .upsert({ name: new_brand, slug }, { onConflict: "slug" })
      .select("id")
      .single();
    if (error) return { ok: false, error: `Could not add brand: ${error.message}` };
    brandId = data.id;
  }

  let modelId = new_brand ? null : fields.model_id;
  if (!modelId && new_model) {
    const slug = slugify(new_model);
    const { data, error } = await supabase
      .from("models")
      .upsert({ brand_id: brandId, name: new_model, slug }, { onConflict: "brand_id,slug" })
      .select("id")
      .single();
    if (error) return { ok: false, error: `Could not add model: ${error.message}` };
    modelId = data.id;
  }
  if (!modelId) return { ok: false, error: "Pick a model" };

  // The car's type lives on the model. Only fill it in where the model doesn't have one yet.
  if (model_category) {
    await supabase.from("models").update({ category: model_category }).eq("id", modelId).is("category", null);
  }

  const row = { ...fields, brand_id: brandId, model_id: modelId };
  // Saving never publishes. A new car waits under "Ready to publish" on the dashboard;
  // an edit leaves the status as it was. Status changes only through setCarStatus.
  const { data: saved, error } = id
    ? await supabase.from("cars").update(row).eq("id", id).select("id").single()
    : await supabase.from("cars").insert({ ...row, status: "verified" }).select("id").single();
  if (error) return { ok: false, error: error.message };
  const carId: number = saved.id;

  const { error: privateError } = await supabase
    .from("car_private")
    .upsert({ car_id: carId, ...privateFields, location, updated_at: new Date().toISOString() });
  if (privateError) return { ok: false, error: privateError.message };

  // Photos from a sell request are private; copy them into the public bucket now that the
  // car is becoming a listing.
  for (const p of photos) {
    if (p.bucket !== REQUEST_PHOTO_BUCKET) continue;
    if (!p.full_path.startsWith("requests/")) return { ok: false, error: "Unexpected photo" };
    const base = `cars/${crypto.randomUUID()}`;
    for (const [from, to] of [
      [p.full_path, `${base}-full.jpg`],
      [p.thumb_path, `${base}-thumb.jpg`],
    ] as const) {
      const { data: file, error: readError } = await supabase.storage.from(REQUEST_PHOTO_BUCKET).download(from);
      if (readError || !file) return { ok: false, error: "Couldn't copy a photo from the request. Try again." };
      const { error: writeError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(to, file, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (writeError) return { ok: false, error: writeError.message };
    }
    p.full_path = `${base}-full.jpg`;
    p.thumb_path = `${base}-thumb.jpg`;
    delete p.bucket;
  }

  // Photos: replace the rows in the new order, then remove files that were taken out.
  const { data: oldPhotos } = await supabase.from("car_photos").select("full_path, thumb_path").eq("car_id", carId);
  await supabase.from("car_photos").delete().eq("car_id", carId);
  if (photos.length) {
    const { error: photoError } = await supabase
      .from("car_photos")
      .insert(photos.map((p, position) => ({ ...p, car_id: carId, position })));
    if (photoError) return { ok: false, error: photoError.message };
  }
  const kept = new Set(photos.flatMap((p) => [p.full_path, p.thumb_path]));
  const removed = (oldPhotos ?? []).flatMap((p) => [p.full_path, p.thumb_path]).filter((path) => !kept.has(path));
  if (removed.length) await supabase.storage.from(PHOTO_BUCKET).remove(removed);

  if (fromRequestId) {
    await supabase.from("sell_requests").update({ status: "converted", car_id: carId }).eq("id", fromRequestId);
  }

  revalidatePath("/", "layout");
  return { ok: true, id: carId };
}

export async function setCarStatus(id: number, status: CarStatus) {
  await requireAdmin();
  if (!STATUSES.includes(status)) throw new Error("Unknown status");
  const supabase = await createClient();
  const { error } = await supabase.from("cars").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  // Back on sale (or sold through us): the earlier reason for removing it no longer applies.
  if (status !== "archived") {
    await supabase.from("car_private").update({ removed_reason: null, removed_note: null, removed_at: null }).eq("car_id", id);
  }
  revalidatePath("/", "layout");
}

const removeSchema = z.object({
  reason: z.enum(REMOVED_REASONS),
  note: z.string().trim().max(500).optional().default(""),
});

/**
 * Takes a car off the website when it wasn't sold through us: the owner sold it elsewhere,
 * changed their mind, and so on. The car and its history are kept (status Removed); a
 * buyer mid-deal is marked lost with the reason, so the Leads list stays honest.
 */
export async function removeCar(id: number, input: { reason: RemovedReason; note?: string }) {
  await requireAdmin();
  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: friendlyError(parsed.error) };
  const { reason, note } = parsed.data;
  const supabase = await createClient();

  const { data: priv } = await supabase.from("car_private").select("deal_lead_id").eq("car_id", id).maybeSingle();
  if (priv?.deal_lead_id) {
    const { data: lead } = await supabase.from("leads").select("notes").eq("id", priv.deal_lead_id).maybeSingle();
    const line = `Car taken off the site on ${new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}: ${REMOVED_REASON_LABEL[reason].toLowerCase()}.`;
    await supabase
      .from("leads")
      .update({ status: "lost", notes: lead?.notes ? `${lead.notes}\n${line}` : line })
      .eq("id", priv.deal_lead_id);
  }

  const { error: privError } = await supabase.from("car_private").upsert({
    car_id: id,
    removed_reason: reason,
    removed_note: note || null,
    removed_at: new Date().toISOString(),
    deal_lead_id: null,
    deal_token: null,
    deal_started_at: null,
  });
  if (privError) return { ok: false as const, error: privError.message };
  const { error } = await supabase.from("cars").update({ status: "archived" }).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Gone for good. Only for removed cars and ones never put on sale; the rest are taken off the site instead. */
export async function deleteCar(id: number) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: car } = await supabase.from("cars").select("status").eq("id", id).maybeSingle();
  if (car && !DELETABLE_STATUSES.includes(car.status)) throw new Error("Take the car off the website before deleting it.");
  const { data: photos } = await supabase.from("car_photos").select("full_path, thumb_path").eq("car_id", id);
  const { data: docs } = await supabase.from("car_documents").select("path").eq("car_id", id);
  const { error } = await supabase.from("cars").delete().eq("id", id);
  if (!error && docs?.length) await supabase.storage.from("car-documents").remove(docs.map((d) => d.path));
  if (error) throw new Error(error.message);
  const paths = (photos ?? []).flatMap((p) => [p.full_path, p.thumb_path]);
  if (paths.length) await supabase.storage.from(PHOTO_BUCKET).remove(paths);
  revalidatePath("/", "layout");
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// Sell requests

export async function setRequestStatus(id: number, status: RequestStatus) {
  await requireAdmin();
  if (!REQUEST_STATUSES.includes(status)) throw new Error("Unknown status");
  const supabase = await createClient();
  const { error } = await supabase.from("sell_requests").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin", "layout");
}

export async function deleteRequest(id: number) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: request } = await supabase.from("sell_requests").select("photos, car_id").eq("id", id).maybeSingle();
  const { error } = await supabase.from("sell_requests").delete().eq("id", id);
  if (error) throw new Error(error.message);
  // Private request photos always go (a listing has its own copies). Older requests kept
  // photos in the public bucket; those stay if a listing made from the request uses them.
  if (request) {
    const photos = request.photos as PhotoRef[];
    const privatePaths = photos.filter((p) => p.bucket === REQUEST_PHOTO_BUCKET).flatMap((p) => [p.full_path, p.thumb_path]);
    if (privatePaths.length) await supabase.storage.from(REQUEST_PHOTO_BUCKET).remove(privatePaths);
    const publicPaths = photos.filter((p) => p.bucket !== REQUEST_PHOTO_BUCKET).flatMap((p) => [p.full_path, p.thumb_path]);
    if (publicPaths.length && !request.car_id) await supabase.storage.from(PHOTO_BUCKET).remove(publicPaths);
  }
  revalidatePath("/admin", "layout");
  redirect("/admin?tab=submitted");
}

// Leads

const leadSchema = z.object({
  name: optionalText,
  phone: optionalText,
  car_id: z.coerce.number().int().positive().nullable(),
  source: z.enum(LEAD_SOURCES),
  status: z.enum(LEAD_STATUSES),
  follow_up_on: z.iso.date().nullable().or(z.literal("").transform(() => null)),
  notes: optionalText,
});

export type LeadInput = z.input<typeof leadSchema>;

export async function saveLead(id: number | null, input: LeadInput) {
  await requireAdmin();
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues.map((i) => i.message).join(". ") };
  if (!parsed.data.name && !parsed.data.phone) return { ok: false as const, error: "Add a name or a phone number" };
  // Same format everywhere, however it was typed.
  if (parsed.data.phone) parsed.data.phone = prettyPhone(parsed.data.phone);
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("leads").update(parsed.data).eq("id", id)
    : await supabase.from("leads").insert(parsed.data);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: true as const };
}

export async function deleteLead(id: number) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin", "layout");
}

// Site settings (Admin → Settings)

const settingsSchema = z.object({
  name: z.string().trim().min(2, "Business name is too short").max(60),
  tagline: z.string().trim().max(140),
  city: z.string().trim().max(60),
  phone: z.string().trim().min(6, "Enter the phone number").max(20),
  whatsapp: z.string().trim().max(20),
  email: z.string().trim().max(120),
  address: z.string().trim().max(200),
  map_url: z.string().trim().max(500),
  hours: z.string().trim().max(80),
  show_car_area: z.boolean(),
});

export type SettingsInput = z.input<typeof settingsSchema>;

export async function saveSettings(input: SettingsInput) {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the form" };
  const v = parsed.data;

  // WhatsApp wants digits with the country code. An Indian mobile typed either way is fine.
  const whatsappSource = v.whatsapp || v.phone;
  const indian = normalizeIndianPhone(whatsappSource);
  const whatsapp = indian ? waNumber(indian) : whatsappSource.replace(/\D/g, "");
  if (!/^\d{8,15}$/.test(whatsapp)) return { ok: false as const, error: "Enter a WhatsApp number with country code, e.g. 98765 43210 or +91 98765 43210" };

  if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) return { ok: false as const, error: "That email address doesn't look right" };
  if (v.map_url && !v.map_url.startsWith("https://")) return { ok: false as const, error: "The map link must start with https://" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .update({
      name: v.name,
      tagline: v.tagline,
      city: v.city,
      phone: prettyPhone(v.phone),
      whatsapp,
      email: v.email || null,
      address: v.address || null,
      map_url: v.map_url || null,
      hours: v.hours,
      show_car_area: v.show_car_area,
    })
    .eq("id", 1);
  if (error) return { ok: false as const, error: error.message };

  // Name, numbers and hours appear on every page.
  revalidatePath("/", "layout");
  return { ok: true as const };
}

// Deals: one buyer the car is "in deal" with, everyone else waiting in line.

const startDealSchema = z.object({
  leadId: z.number().int().positive().nullable(),
  name: z.string().trim().max(80),
  phone: z.string().trim().max(20),
  token: z.number().int().nonnegative().nullable(),
  notes: z.string().trim().max(500),
});

export type StartDealInput = z.input<typeof startDealSchema>;

/** Puts the car "In deal" with a waiting buyer, or with a new buyer typed in now. */
export async function startDeal(carId: number, input: StartDealInput) {
  await requireAdmin();
  const parsed = startDealSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the form" };
  const { leadId, name, phone, token, notes } = parsed.data;
  const supabase = await createClient();

  const { data: car } = await supabase.from("cars").select("id, status").eq("id", carId).maybeSingle();
  if (!car) return { ok: false as const, error: "Car not found" };
  if (car.status === "sold" || car.status === "archived") return { ok: false as const, error: "This car is no longer for sale" };
  const { data: current } = await supabase.from("car_private").select("deal_lead_id").eq("car_id", carId).maybeSingle();
  if (car.status === "reserved" && current?.deal_lead_id) return { ok: false as const, error: "This car is already in a deal. End that one first." };

  let buyerId = leadId;
  if (buyerId) {
    const { data: lead } = await supabase.from("leads").select("id, car_id").eq("id", buyerId).maybeSingle();
    if (!lead || lead.car_id !== carId) return { ok: false as const, error: "That buyer isn't waiting on this car" };
    const update: Record<string, unknown> = { status: "in-deal" };
    if (notes) update.notes = notes;
    await supabase.from("leads").update(update).eq("id", buyerId);
  } else {
    if (!name && !phone) return { ok: false as const, error: "Add the buyer's name or phone" };
    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        name: name || null,
        phone: phone ? prettyPhone(phone) : null,
        car_id: carId,
        source: "call",
        status: "in-deal",
        notes: notes || null,
      })
      .select("id")
      .single();
    if (error) return { ok: false as const, error: error.message };
    buyerId = lead.id;
  }

  const { error: dealError } = await supabase
    .from("car_private")
    .upsert({ car_id: carId, deal_lead_id: buyerId, deal_token: token, deal_started_at: new Date().toISOString() });
  if (dealError) return { ok: false as const, error: dealError.message };
  const { error } = await supabase.from("cars").update({ status: "reserved" }).eq("id", carId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true as const };
}

/**
 * Ends the current deal. "sold": the buyer bought it. "fell-through": the buyer dropped out;
 * the car goes to the next buyer if one is given, otherwise back on sale.
 */
export async function endDeal(carId: number, outcome: "sold" | "fell-through", nextLeadId?: number | null) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: deal } = await supabase.from("car_private").select("deal_lead_id").eq("car_id", carId).maybeSingle();
  const buyerId = deal?.deal_lead_id ?? null;

  if (outcome === "sold") {
    if (buyerId) await supabase.from("leads").update({ status: "bought" }).eq("id", buyerId);
    const { error } = await supabase.from("cars").update({ status: "sold" }).eq("id", carId);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/", "layout");
    return { ok: true as const };
  }

  if (buyerId) {
    const { data: lead } = await supabase.from("leads").select("notes").eq("id", buyerId).maybeSingle();
    const note = `Deal fell through on ${new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}.`;
    await supabase
      .from("leads")
      .update({ status: "lost", notes: lead?.notes ? `${lead.notes}\n${note}` : note })
      .eq("id", buyerId);
  }
  await supabase.from("car_private").update({ deal_lead_id: null, deal_token: null, deal_started_at: null }).eq("car_id", carId);

  if (nextLeadId) {
    // Straight on to the next buyer in line; the car stays In deal.
    await supabase.from("cars").update({ status: "listed" }).eq("id", carId);
    return startDeal(carId, { leadId: nextLeadId, name: "", phone: "", token: null, notes: "" });
  }
  const { error } = await supabase.from("cars").update({ status: "listed" }).eq("id", carId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Takes a buyer out of a car's waiting line. */
export async function removeFromQueue(leadId: number) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("leads").update({ status: "lost" }).eq("id", leadId).neq("status", "in-deal");
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin", "layout");
  return { ok: true as const };
}

// Papers: public ticks, private document copies.

const DOC_BUCKET = "car-documents";

const papersSchema = z.object({
  papers_rc_seen: z.boolean(),
  papers_insurance: z.boolean(),
  papers_puc: z.boolean(),
  papers_service_records: z.boolean(),
  papers_loan: z.enum(["none", "closing"]).nullable(),
});

export type PapersInput = z.input<typeof papersSchema>;

/** What the mediator checked. Buyers see these as ticks on the car page. */
export async function savePapers(carId: number, input: PapersInput) {
  await requireAdmin();
  const parsed = papersSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Check the papers list" };
  const supabase = await createClient();
  const { error } = await supabase.from("cars").update(parsed.data).eq("id", carId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function setDocsConsent(carId: number, consent: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("car_private").upsert({ car_id: carId, docs_consent: consent });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/admin/cars/${carId}`);
  return { ok: true as const };
}

const documentSchema = z.object({
  kind: z.enum(DOCUMENT_KINDS),
  path: z.string().min(1).max(300),
  file_name: z.string().trim().min(1).max(200),
  mime: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
  size_bytes: z.number().int().positive().max(10 * 1024 * 1024),
});

/** Records a copy the browser has just uploaded to the private bucket. */
export async function recordDocument(carId: number, input: z.input<typeof documentSchema>) {
  await requireAdmin();
  const parsed = documentSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "That file can't be kept here" };
  // Only files in this car's own folder.
  if (!parsed.data.path.startsWith(`cars/${carId}/`)) return { ok: false as const, error: "Wrong folder for this car" };
  const supabase = await createClient();
  const { data: priv } = await supabase.from("car_private").select("docs_consent").eq("car_id", carId).maybeSingle();
  if (!priv?.docs_consent) {
    await supabase.storage.from(DOC_BUCKET).remove([parsed.data.path]);
    return { ok: false as const, error: "Tick that the owner agreed before keeping copies" };
  }
  const { data: car } = await supabase.from("cars").select("status, sold_at").eq("id", carId).maybeSingle();
  const deleteAfter = car?.status === "sold" ? new Date(Date.now() + 30 * 86400_000).toISOString() : null;
  const { error } = await supabase.from("car_documents").insert({ ...parsed.data, car_id: carId, delete_after: deleteAfter });
  if (error) {
    await supabase.storage.from(DOC_BUCKET).remove([parsed.data.path]);
    return { ok: false as const, error: error.message };
  }
  revalidatePath(`/admin/cars/${carId}`);
  return { ok: true as const };
}

/** A link to one copy that stops working after five minutes. */
export async function documentLink(id: number) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: doc } = await supabase.from("car_documents").select("path").eq("id", id).maybeSingle();
  if (!doc) return { ok: false as const, error: "Not found" };
  const { data, error } = await supabase.storage.from(DOC_BUCKET).createSignedUrl(doc.path, 300);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, url: data.signedUrl };
}

export async function deleteDocument(id: number) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: doc } = await supabase.from("car_documents").select("path, car_id").eq("id", id).maybeSingle();
  if (!doc) return { ok: true as const };
  await supabase.storage.from(DOC_BUCKET).remove([doc.path]);
  const { error } = await supabase.from("car_documents").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/admin/cars/${doc.car_id}`);
  return { ok: true as const };
}

/** Removes copies whose keep-until date has passed (30 days after the sale). */
export async function purgeExpiredDocuments() {
  const admin = await getAdmin();
  if (!admin?.mfa) return;
  const supabase = await createClient();
  const { data } = await supabase
    .from("car_documents")
    .select("id, path")
    .lt("delete_after", new Date().toISOString())
    .limit(100);
  if (!data?.length) return;
  await supabase.storage.from(DOC_BUCKET).remove(data.map((d) => d.path));
  await supabase.from("car_documents").delete().in("id", data.map((d) => d.id));
}

// Admin accounts: invite, remove, reset two-step login. These use the service key because
// they change sign-in accounts, so each one checks the caller is a fully signed-in admin first.

export async function inviteAdmin(email: string) {
  await requireAdmin();
  const parsed = z.email().max(200).safeParse(email.trim().toLowerCase());
  if (!parsed.success) return { ok: false as const, error: "That email address doesn't look right" };
  const service = createServiceClient();

  const { data: users } = await service.auth.admin.listUsers({ perPage: 1000 });
  const existing = users?.users.find((u) => u.email?.toLowerCase() === parsed.data);
  if (existing) {
    const { error } = await service.from("admins").upsert({ user_id: existing.id });
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/admin/settings");
    return { ok: true as const, message: `${parsed.data} already had an account and is now an admin. They can sign in, or use "Forgot password".` };
  }

  const { data, error } = await service.auth.admin.inviteUserByEmail(parsed.data);
  if (error) return { ok: false as const, error: error.message };
  const { error: listError } = await service.from("admins").insert({ user_id: data.user.id });
  if (listError) return { ok: false as const, error: listError.message };
  revalidatePath("/admin/settings");
  return { ok: true as const, message: `Invite sent to ${parsed.data}. The link lets them choose a password, then set up two-step login.` };
}

export async function removeAdmin(userId: string) {
  const me = await requireAdmin();
  if (userId === me.id) return { ok: false as const, error: "You can't remove yourself. Ask another admin." };
  const service = createServiceClient();
  const { count } = await service.from("admins").select("user_id", { count: "exact", head: true });
  if ((count ?? 0) <= 1) return { ok: false as const, error: "There must always be at least one admin." };
  // Rights end on their next click: every admin page and database rule checks this list.
  const { error } = await service.from("admins").delete().eq("user_id", userId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/settings");
  return { ok: true as const, message: "Removed. They no longer have admin access." };
}

/** For an admin who lost their phone: they set two-step login up again at their next sign-in. */
export async function resetAdminMfa(userId: string) {
  const me = await requireAdmin();
  if (userId === me.id) return { ok: false as const, error: "Ask another admin to reset your own two-step login." };
  const service = createServiceClient();
  const { data: rows } = await service.from("admins").select("user_id").eq("user_id", userId);
  if (!rows?.length) return { ok: false as const, error: "That person isn't an admin" };
  const { data, error } = await service.auth.admin.mfa.listFactors({ userId });
  if (error) return { ok: false as const, error: error.message };
  for (const factor of data.factors) await service.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
  revalidatePath("/admin/settings");
  return { ok: true as const, message: "Two-step login reset. They'll set it up again when they next sign in." };
}
