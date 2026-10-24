import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/site";
import { carPath } from "@/lib/car-url";
import { createPublicClient } from "@/lib/supabase/public";
import type { CarWithRelations } from "@/lib/types";

// Search engines fetch this now and then; an hour-old list is plenty.
export const revalidate = 3600;

type SitemapCar = Pick<CarWithRelations, "id" | "year" | "variant" | "brand" | "model" | "updated_at">;

/** /sitemap.xml: the public pages plus every car that is on sale or in a deal. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = (path: string) => new URL(path, siteUrl).toString();

  const { data } = await createPublicClient()
    .from("cars")
    .select("id, year, variant, updated_at, brand:brands!inner(name), model:models!inner(name)")
    .in("status", ["listed", "reserved"])
    .order("updated_at", { ascending: false })
    .limit(1000);
  const cars = (data ?? []) as unknown as SitemapCar[];

  return [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/cars"), changeFrequency: "daily", priority: 0.9 },
    { url: url("/sell"), changeFrequency: "monthly", priority: 0.7 },
    { url: url("/sold"), changeFrequency: "weekly", priority: 0.5 },
    { url: url("/contact"), changeFrequency: "monthly", priority: 0.5 },
    { url: url("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    ...cars.map((car) => ({
      url: url(carPath(car)),
      lastModified: new Date(car.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
