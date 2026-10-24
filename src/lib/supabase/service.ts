import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

/**
 * Bypasses row level security. Only for server code that has already validated its input,
 * like the public sell form. Never import this from a client component.
 */
export function createServiceClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("SUPABASE_SECRET_KEY is not set");
  return createClient(supabaseUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
