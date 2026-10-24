import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "./env";

/**
 * For public pages: reads as an anonymous visitor and never touches cookies, so Next.js can
 * cache the page and serve it to everyone. Row level security decides what it can see.
 */
export function createPublicClient() {
  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
