// Business details live in the site_settings table and are edited in Admin → Settings.
// These values are only the fallback if that row can't be read.

export type Site = {
  name: string;
  tagline: string;
  /** The area the business serves, e.g. "Coorg". */
  city: string;
  phone: string;
  /** Digits only with country code, as wa.me wants it, e.g. 919876543210. */
  whatsapp: string;
  email: string | null;
  /** No shop yet: leave empty and the address and map stay hidden everywhere. */
  address: string | null;
  mapUrl: string | null;
  hours: string;
  /** Show the area each car is in (e.g. "Kushalnagar") on the website. */
  showCarArea: boolean;
};

export const defaultSite: Site = {
  name: "Coorg Car Point",
  tagline: "Verified second-hand cars, straight from their owners.",
  city: "Coorg",
  phone: "+91 98765 43210",
  whatsapp: "919876543210",
  email: null,
  address: null,
  mapUrl: null,
  hours: "Mon–Sat, 9 am – 7 pm",
  showCarArea: false,
};

/** The public address of the site, used in share previews. */
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3060";
