"use server";

import { z } from "zod";
import { normalizeIndianPhone } from "@/lib/phone";
import { DAY, HOUR, clientIpHash, withinLimits } from "@/lib/rate-limit";
import { REQUEST_PHOTO_BUCKET } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/service";
import { FUELS, TRANSMISSIONS } from "@/lib/types";

const MAX_PHOTOS = 10;
const PER_IP_PER_HOUR = 3;
const PER_PHONE_PER_DAY = 3;
// However many addresses someone uses, the whole site takes at most this many an hour.
const ALL_PER_HOUR = 20;

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable()
    .optional();

const optionalInt = (min: number, max: number) =>
  z
    .union([z.literal(""), z.coerce.number().int().min(min).max(max)])
    .nullable()
    .optional()
    .transform((v) => (v === "" || v == null ? null : v));

const requestSchema = z
  .object({
    seller_name: z.string().trim().min(2, "Enter your name").max(80),
    seller_phone: z.string().trim().max(20),
    brand_id: z.coerce.number().int().positive().nullable(),
    brand_text: text(60),
    model_id: z.coerce.number().int().positive().nullable(),
    model_text: text(60),
    variant: text(60),
    year: optionalInt(1950, new Date().getFullYear() + 1),
    fuel: z.enum(FUELS).nullable(),
    transmission: z.enum(TRANSMISSIONS).nullable(),
    km_driven: optionalInt(0, 2_000_000),
    expected_price: optionalInt(1, 100_000_000),
    location: text(80),
    notes: text(1000),
    photo_count: z.number().int().min(0).max(MAX_PHOTOS),
    // Hidden field people never see; bots fill it in.
    website: z.string().max(0, "Something went wrong").optional(),
  })
  .refine((v) => v.brand_id || v.brand_text, { message: "Choose the brand", path: ["brand_id"] })
  .refine((v) => v.model_id || v.model_text, { message: "Choose the model", path: ["model_id"] });

export type SellRequestInput = z.input<typeof requestSchema>;

type Upload = { index: number; fullPath: string; fullToken: string; thumbPath: string; thumbToken: string };
export type StartResult =
  | { ok: false; error: string }
  | { ok: true; code: string; token: string; uploads: Upload[] };

/**
 * Saves the request and hands back one-time upload links for the photos, so they go straight
 * to storage from the phone instead of through this server.
 */
export async function startSellRequest(input: SellRequestInput): Promise<StartResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form" };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- drop the honeypot before saving
  const { photo_count, website, ...fields } = parsed.data;

  const phone = normalizeIndianPhone(fields.seller_phone);
  if (!phone) return { ok: false, error: "Enter a 10-digit mobile number" };

  const hash = await clientIpHash();
  const allowed = await withinLimits([
    [`sell:ip:${hash}`, PER_IP_PER_HOUR, HOUR],
    [`sell:phone:${phone}`, PER_PHONE_PER_DAY, DAY],
    ["sell:all", ALL_PER_HOUR, HOUR],
  ]);
  if (!allowed) {
    return { ok: false, error: "We already have your request. We will call you soon — or message us on WhatsApp." };
  }

  const supabase = createServiceClient();

  // A picked brand wins over typed text; a typed model only makes sense with it.
  const row = {
    ...fields,
    seller_phone: phone,
    brand_text: fields.brand_id ? null : fields.brand_text,
    model_text: fields.model_id ? null : fields.model_text,
    ip_hash: hash,
  };
  const { data, error } = await supabase.from("sell_requests").insert(row).select("code, token").single();
  if (error) {
    console.error("sell request insert failed", error);
    return { ok: false, error: "Could not send your request. Please try again or message us on WhatsApp." };
  }

  const uploads: Upload[] = [];
  for (let index = 0; index < photo_count; index++) {
    const fullPath = `requests/${data.token}/${index}-full.jpg`;
    const thumbPath = `requests/${data.token}/${index}-thumb.jpg`;
    const [full, thumb] = await Promise.all([
      supabase.storage.from(REQUEST_PHOTO_BUCKET).createSignedUploadUrl(fullPath),
      supabase.storage.from(REQUEST_PHOTO_BUCKET).createSignedUploadUrl(thumbPath),
    ]);
    if (full.error || thumb.error) {
      console.error("signed upload url failed", full.error ?? thumb.error);
      break;
    }
    uploads.push({ index, fullPath, fullToken: full.data.token, thumbPath, thumbToken: thumb.data.token });
  }

  return { ok: true, code: data.code, token: data.token, uploads };
}

const dimsSchema = z.array(z.object({ width: z.number().int().positive().max(4000), height: z.number().int().positive().max(4000) })).max(MAX_PHOTOS);

/** Records which photos actually arrived. Only trusts files it finds in the request's own folder. */
export async function finishSellRequest(token: string, dims: { width: number; height: number }[]) {
  if (!z.uuid().safeParse(token).success) return;
  const sizes = dimsSchema.safeParse(dims);
  if (!sizes.success) return;

  const supabase = createServiceClient();
  const { data: request } = await supabase
    .from("sell_requests")
    .select("id, created_at, photos")
    .eq("token", token)
    .maybeSingle();
  // Only once, and only shortly after the request was made.
  if (!request || (request.photos as unknown[]).length > 0) return;
  if (Date.now() - new Date(request.created_at).getTime() > 2 * 60 * 60 * 1000) return;

  const { data: files } = await supabase.storage.from(REQUEST_PHOTO_BUCKET).list(`requests/${token}`, { limit: 100 });
  const names = new Set((files ?? []).map((f) => f.name));
  const photos = [];
  for (let i = 0; i < MAX_PHOTOS; i++) {
    if (names.has(`${i}-full.jpg`) && names.has(`${i}-thumb.jpg`)) {
      photos.push({
        full_path: `requests/${token}/${i}-full.jpg`,
        thumb_path: `requests/${token}/${i}-thumb.jpg`,
        width: sizes.data[i]?.width ?? null,
        height: sizes.data[i]?.height ?? null,
        bucket: REQUEST_PHOTO_BUCKET,
      });
    }
  }
  if (photos.length) await supabase.from("sell_requests").update({ photos }).eq("id", request.id);
}
