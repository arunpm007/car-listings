import "server-only";
import { getSite } from "./settings";
import { createPublicClient } from "./supabase/public";
import { createClient } from "./supabase/server";
import { createServiceClient } from "./supabase/service";
import {
  CATEGORIES,
  type Brand,
  type Category,
  type CarStatus,
  type CarWithRelations,
  type Model,
} from "./types";

const CAR_SELECT = "*, brand:brands!inner(name, slug), model:models!inner(name, slug, category), photos:car_photos(*)";

/**
 * The area is private (it hints at where the owner lives). Only when Settings says to show it
 * does the server look it up for the cars on the page; it's never readable through the public API.
 */
async function withAreas(cars: CarWithRelations[]) {
  if (!cars.length || !(await getSite()).showCarArea) return cars;
  const { data } = await createServiceClient()
    .from("car_private")
    .select("car_id, location")
    .in("car_id", cars.map((c) => c.id));
  const areas = new Map((data ?? []).map((r) => [r.car_id as number, r.location as string | null]));
  for (const car of cars) car.area = areas.get(car.id) ?? null;
  return cars;
}

function sortPhotos(cars: CarWithRelations[]) {
  for (const car of cars) car.photos.sort((a, b) => a.position - b.position);
  return cars;
}

export type CarFilters = {
  brand?: string;
  category?: Category;
  /** Only cars that are with us and can be seen straight away. */
  ready?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price-asc" | "price-desc" | "km-asc";
};

type SearchParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInt(value: string | undefined) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : undefined;
}

/** Turns the query string into filters, dropping anything that isn't a known value. */
export function parseFilters(params: SearchParams): CarFilters {
  const sort = one(params.sort);
  const category = one(params.type);
  return {
    brand: one(params.brand) || undefined,
    category: CATEGORIES.find((c) => c === category),
    ready: one(params.ready) === "1" || undefined,
    minPrice: positiveInt(one(params.minPrice)),
    maxPrice: positiveInt(one(params.maxPrice)),
    sort: (["newest", "price-asc", "price-desc", "km-asc"] as const).find((s) => s === sort) ?? "newest",
  };
}

/** Cars buyers can see right now: listed and reserved. */
export async function getAvailableCars(filters: CarFilters = {}, limit = 60) {
  const supabase = createPublicClient();
  let query = supabase.from("cars").select(CAR_SELECT).in("status", ["listed", "reserved"]);

  if (filters.brand) query = query.eq("brand.slug", filters.brand);
  if (filters.category) query = query.eq("model.category", filters.category);
  if (filters.ready) query = query.eq("with_us", true);
  if (filters.minPrice) query = query.gte("price", filters.minPrice);
  if (filters.maxPrice) query = query.lte("price", filters.maxPrice);

  switch (filters.sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "km-asc":
      query = query.order("km_driven", { ascending: true });
      break;
    default:
      // Featured first, then cars buyers can see straight away, then the rest by date.
      query = query.order("featured", { ascending: false }).order("with_us", { ascending: false }).order("listed_at", { ascending: false });
  }

  const { data, error } = await query.limit(limit);
  if (error) throw error;
  return withAreas(sortPhotos(data as CarWithRelations[]));
}

export async function getSoldCars(limit = 24) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("cars")
    .select(CAR_SELECT)
    .eq("status", "sold")
    .order("sold_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return withAreas(sortPhotos(data as CarWithRelations[]));
}

/** One car for the public site: only cars buyers may see. */
export async function getCar(id: number) {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("cars").select(CAR_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? (await withAreas(sortPhotos([data as CarWithRelations])))[0] : null;
}

/** One car for the admin, whatever its status. */
export async function getCarForAdmin(id: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cars").select(CAR_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? sortPhotos([data as CarWithRelations])[0] : null;
}

/** Brands that have at least one car on sale, for the filter dropdown. */
export async function getBrandsInStock() {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id, name, slug, popular, cars!inner(id)")
    .in("cars.status", ["listed", "reserved"])
    .order("name");
  if (error) throw error;
  return (data ?? []).map(({ id, name, slug, popular }) => ({ id, name, slug, popular })) as Brand[];
}

export async function getCatalog() {
  const supabase = createPublicClient();
  const [brands, models] = await Promise.all([
    supabase.from("brands").select("id, name, slug, popular").order("popular", { ascending: false }).order("name"),
    supabase.from("models").select("id, brand_id, name, slug, category").order("name"),
  ]);
  if (brands.error) throw brands.error;
  if (models.error) throw models.error;
  return { brands: brands.data as Brand[], models: models.data as Model[] };
}

/** Every car regardless of status, for the admin dashboard. */
export async function getAllCarsForAdmin(status?: CarStatus) {
  const supabase = await createClient();
  let query = supabase.from("cars").select(CAR_SELECT).order("updated_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return sortPhotos(data as CarWithRelations[]);
}

export async function getSoldCount() {
  const supabase = createPublicClient();
  const { count, error } = await supabase.from("cars").select("id", { count: "exact", head: true }).eq("status", "sold");
  if (error) throw error;
  return count ?? 0;
}
