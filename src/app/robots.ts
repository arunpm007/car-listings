import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/site";

/** /robots.txt: search engines may read everything except the admin, and are pointed at the sitemap. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
  };
}
