export const STATUSES = ["submitted", "verified", "listed", "reserved", "sold", "archived"] as const;
export type CarStatus = (typeof STATUSES)[number];

/** Statuses the public website shows. Everything else is admin-only. Keep in step with the cars RLS policy. */
export const PUBLIC_STATUSES: readonly CarStatus[] = ["listed", "reserved", "sold"];
export const isPublicStatus = (status: CarStatus) => PUBLIC_STATUSES.includes(status);

export const FUELS = ["petrol", "diesel", "cng", "lpg", "electric", "hybrid"] as const;
export type Fuel = (typeof FUELS)[number];

export const TRANSMISSIONS = ["manual", "automatic"] as const;
export type Transmission = (typeof TRANSMISSIONS)[number];

export const CATEGORIES = ["hatchback", "sedan", "suv", "muv"] as const;
export type Category = (typeof CATEGORIES)[number];

export type Brand = { id: number; name: string; slug: string; popular: boolean };
export type Model = { id: number; brand_id: number; name: string; slug: string; category: Category | null };

export type CarPhoto = {
  id: number;
  car_id: number;
  full_path: string;
  thumb_path: string;
  width: number | null;
  height: number | null;
  position: number;
  credit: string | null;
};

export type Car = {
  id: number;
  code: string;
  status: CarStatus;
  brand_id: number;
  model_id: number;
  variant: string | null;
  year: number;
  fuel: Fuel;
  transmission: Transmission;
  km_driven: number;
  owners: number;
  color: string | null;
  rto: string | null;
  insurance_valid_until: string | null;
  price: number;
  negotiable: boolean;
  description: string | null;
  featured: boolean;
  /** The car (or its keys) is with the business; otherwise it's with its owner. */
  with_us: boolean;
  papers_rc_seen: boolean;
  papers_insurance: boolean;
  papers_puc: boolean;
  papers_service_records: boolean;
  papers_loan: "none" | "closing" | null;
  listed_at: string | null;
  sold_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Statuses a car can be deleted from: never put on sale, or already taken off the site. */
export const DELETABLE_STATUSES: CarStatus[] = ["submitted", "verified", "archived"];

/** Why a car came off the website without being sold through us. */
export const REMOVED_REASONS = ["sold_elsewhere", "owner_withdrew", "other"] as const;
export type RemovedReason = (typeof REMOVED_REASONS)[number];
export const REMOVED_REASON_LABEL: Record<RemovedReason, string> = {
  sold_elsewhere: "Owner sold it elsewhere",
  owner_withdrew: "Owner isn't selling any more",
  other: "Other reason",
};

export type CarPrivate = {
  car_id: number;
  seller_name: string | null;
  seller_phone: string | null;
  reg_number: string | null;
  seller_min_price: number | null;
  commission: number | null;
  notes: string | null;
  deal_lead_id: number | null;
  deal_token: number | null;
  deal_started_at: string | null;
  docs_consent: boolean;
  location: string | null;
  removed_reason: RemovedReason | null;
  removed_note: string | null;
  removed_at: string | null;
};

export const DOCUMENT_KINDS = ["rc", "insurance", "puc", "noc", "service", "other"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export type CarDocument = {
  id: number;
  car_id: number;
  kind: DocumentKind;
  path: string;
  file_name: string;
  mime: string;
  size_bytes: number;
  delete_after: string | null;
  created_at: string;
};

// What list and detail queries return: the car with its brand, model and photos joined in.
export type CarWithRelations = Car & {
  /** The car's area, only filled in on public pages when Settings allows showing it. */
  area?: string | null;
  brand: Pick<Brand, "name" | "slug">;
  model: Pick<Model, "name" | "slug" | "category">;
  photos: CarPhoto[];
};

export type PhotoRef = {
  full_path: string;
  thumb_path: string;
  width: number | null;
  height: number | null;
  credit?: string | null;
  /** Set when the files are in the private request-photos bucket rather than car-photos. */
  bucket?: "request-photos";
  /** Short-lived links for private photos, added by the server for the admin to see them. */
  full_url?: string;
  thumb_url?: string;
};

export const REQUEST_STATUSES = ["new", "contacted", "converted", "rejected"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export type SellRequest = {
  id: number;
  code: string;
  status: RequestStatus;
  seller_name: string;
  seller_phone: string;
  brand_id: number | null;
  brand_text: string | null;
  model_id: number | null;
  model_text: string | null;
  variant: string | null;
  year: number | null;
  fuel: Fuel | null;
  transmission: Transmission | null;
  km_driven: number | null;
  expected_price: number | null;
  location: string | null;
  notes: string | null;
  photos: PhotoRef[];
  car_id: number | null;
  created_at: string;
  brand: { name: string } | null;
  model: { name: string } | null;
};

export const LEAD_SOURCES = ["call", "whatsapp", "walk-in", "referral", "other"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_STATUSES = ["new", "follow-up", "visit-booked", "in-deal", "bought", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type Lead = {
  id: number;
  name: string | null;
  phone: string | null;
  car_id: number | null;
  source: LeadSource;
  status: LeadStatus;
  follow_up_on: string | null;
  notes: string | null;
  created_at: string;
  car: { code: string; year: number; variant: string | null; brand: { name: string }; model: { name: string } } | null;
};
