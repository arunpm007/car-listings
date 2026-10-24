import "server-only";
import { cache } from "react";
import { defaultSite, type Site } from "@/config/site";
import { createPublicClient } from "./supabase/public";

type Row = {
  name: string;
  tagline: string;
  city: string;
  phone: string;
  whatsapp: string;
  email: string | null;
  address: string | null;
  map_url: string | null;
  hours: string;
  show_car_area: boolean;
};

export function rowToSite(row: Row): Site {
  return {
    name: row.name,
    tagline: row.tagline,
    city: row.city,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    address: row.address,
    mapUrl: row.map_url,
    hours: row.hours,
    showCarArea: row.show_car_area,
  };
}

/** The business details from Admin → Settings. Read once per request; falls back to the defaults. */
export const getSite = cache(async (): Promise<Site> => {
  const supabase = createPublicClient();
  const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) {
    if (error) console.error("site settings read failed", error);
    return defaultSite;
  }
  return rowToSite(data as Row);
});
