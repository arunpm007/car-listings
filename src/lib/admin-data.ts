import "server-only";
import { REQUEST_PHOTO_BUCKET } from "./supabase/env";
import { createClient, requireAdmin } from "./supabase/server";
import { createServiceClient } from "./supabase/service";
import { todayInIndia } from "./format";
import type { CarPrivate, Lead, LeadStatus, RequestStatus, SellRequest } from "./types";

const REQUEST_SELECT = "*, brand:brands(name), model:models(name)";

export async function getSellRequests(statuses: RequestStatus[]) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sell_requests")
    .select(REQUEST_SELECT)
    .in("status", statuses)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return signRequestPhotos(data as SellRequest[]);
}

export async function getSellRequest(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("sell_requests").select(REQUEST_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? (await signRequestPhotos([data as SellRequest]))[0] : null;
}

/** Adds one-hour links to request photos kept in the private bucket, so the admin can see them. */
async function signRequestPhotos(requests: SellRequest[]) {
  const paths = requests.flatMap((r) => r.photos.filter((p) => p.bucket === REQUEST_PHOTO_BUCKET).flatMap((p) => [p.full_path, p.thumb_path]));
  if (!paths.length) return requests;
  const supabase = await createClient();
  const { data } = await supabase.storage.from(REQUEST_PHOTO_BUCKET).createSignedUrls(paths, 3600);
  const urls = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  for (const r of requests) {
    for (const p of r.photos) {
      if (p.bucket !== REQUEST_PHOTO_BUCKET) continue;
      p.full_url = urls.get(p.full_path) ?? undefined;
      p.thumb_url = urls.get(p.thumb_path) ?? undefined;
    }
  }
  return requests;
}

export function requestTitle(r: SellRequest) {
  return [r.year, r.brand?.name ?? r.brand_text, r.model?.name ?? r.model_text, r.variant].filter(Boolean).join(" ");
}

const LEAD_SELECT = "*, car:cars(code, year, variant, brand:brands(name), model:models(name))";
export const OPEN_LEAD_STATUSES: LeadStatus[] = ["new", "follow-up", "visit-booked", "in-deal"];
/** Open leads that are waiting their turn on a car (everyone except the buyer in the deal). */
export const WAITING_LEAD_STATUSES: LeadStatus[] = ["new", "follow-up", "visit-booked"];

export async function getLeads({ open, carId }: { open?: boolean; carId?: number } = {}) {
  const supabase = await createClient();
  let query = supabase.from("leads").select(LEAD_SELECT);
  if (open === true) query = query.in("status", OPEN_LEAD_STATUSES);
  if (open === false) query = query.not("status", "in", `(${OPEN_LEAD_STATUSES.join(",")})`);
  if (carId) query = query.eq("car_id", carId);
  const { data, error } = await query
    .order("follow_up_on", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Lead[];
}

/** Calls and WhatsApp taps per car in the last 30 days. */
export async function getInterest() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("car_interest").select("car_id, calls, whatsapps");
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.car_id as number, { calls: r.calls as number, whatsapps: r.whatsapps as number }]));
}

/** Numbers for the admin header: requests waiting and follow-ups due today or earlier. */
export async function getAdminBadges() {
  const supabase = await createClient();
  const today = todayInIndia();
  const [requests, due] = await Promise.all([
    supabase.from("sell_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .in("status", OPEN_LEAD_STATUSES)
      .lte("follow_up_on", today),
  ]);
  return { newRequests: requests.count ?? 0, leadsDue: due.count ?? 0 };
}

export type DealSummary = { leadId: number | null; buyer: string | null; phone: string | null; token: number | null; startedAt: string | null; waiting: number };

/** For each car: who it's in deal with, and how many buyers are waiting. */
/** Why each removed car came off the website, keyed by car id. */
export async function getRemovedReasons() {
  const supabase = await createClient();
  const { data } = await supabase.from("car_private").select("car_id, removed_reason, removed_note, removed_at").not("removed_at", "is", null);
  type Removed = Pick<CarPrivate, "removed_reason" | "removed_note" | "removed_at">;
  return new Map<number, Removed>((data ?? []).map((r) => [r.car_id, r as Removed]));
}

export async function getDealSummaries() {
  const supabase = await createClient();
  const [deals, waiting] = await Promise.all([
    supabase
      .from("car_private")
      .select("car_id, deal_lead_id, deal_token, deal_started_at, lead:leads!car_private_deal_lead_id_fkey(name, phone)")
      .not("deal_lead_id", "is", null),
    supabase.from("leads").select("car_id").in("status", WAITING_LEAD_STATUSES).not("car_id", "is", null),
  ]);
  if (deals.error) throw deals.error;
  if (waiting.error) throw waiting.error;

  const map = new Map<number, DealSummary>();
  const get = (carId: number) =>
    map.get(carId) ?? map.set(carId, { leadId: null, buyer: null, phone: null, token: null, startedAt: null, waiting: 0 }).get(carId)!;
  for (const w of waiting.data ?? []) get(w.car_id as number).waiting++;
  for (const d of deals.data ?? []) {
    const lead = d.lead as unknown as { name: string | null; phone: string | null } | null;
    Object.assign(get(d.car_id as number), {
      leadId: d.deal_lead_id,
      buyer: lead?.name ?? null,
      phone: lead?.phone ?? null,
      token: d.deal_token,
      startedAt: d.deal_started_at,
    });
  }
  return map;
}

export type AdminAccount = { id: string; email: string | null; addedAt: string; lastSignIn: string | null; hasMfa: boolean };

/** Everyone on the admin list, with whether they've set up two-step login. Admin pages only. */
export async function getAdminAccounts(): Promise<AdminAccount[]> {
  // Reads with the secret key, so it must check for itself.
  await requireAdmin();
  const service = createServiceClient();
  const [{ data: rows }, { data: users }] = await Promise.all([
    service.from("admins").select("user_id, created_at").order("created_at"),
    service.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const byId = new Map((users?.users ?? []).map((u) => [u.id, u]));
  // The user list doesn't carry two-step details, so ask for each admin's factors.
  return Promise.all(
    (rows ?? []).map(async (r) => {
      const id = r.user_id as string;
      const u = byId.get(id);
      const { data: factors } = await service.auth.admin.mfa.listFactors({ userId: id });
      return {
        id,
        email: u?.email ?? null,
        addedAt: r.created_at as string,
        lastSignIn: u?.last_sign_in_at ?? null,
        hasMfa: (factors?.factors ?? []).some((f) => f.status === "verified"),
      };
    }),
  );
}
