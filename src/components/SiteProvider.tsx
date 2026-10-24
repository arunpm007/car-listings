"use client";

import { createContext, useContext } from "react";
import { defaultSite, type Site } from "@/config/site";

const SiteContext = createContext<Site>(defaultSite);

/** Hands the business details (from Admin → Settings) to client components. */
export function SiteProvider({ site, children }: { site: Site; children: React.ReactNode }) {
  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
}

export function useSite() {
  return useContext(SiteContext);
}
