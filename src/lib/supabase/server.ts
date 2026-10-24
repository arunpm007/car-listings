import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseKey, supabaseUrl } from "./env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. proxy.ts refreshes the session instead.
        }
      },
    },
  });
}

/**
 * The signed-in admin, or null. Checks the admins table, not just that someone is logged in.
 * `mfa` is true once they've passed two-step login in this session (assurance level aal2).
 */
export async function getAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;
  const { data: row } = await supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!row) return null;
  return {
    id: userId,
    email: (data.claims.email as string | undefined) ?? null,
    mfa: data.claims.aal === "aal2",
  };
}
