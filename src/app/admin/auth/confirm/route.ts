import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Landing for the links in invite and password-reset emails. The one-time token is checked here,
// on the server; then the person chooses their password.
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (!tokenHash || (type !== "invite" && type !== "recovery")) return to("/admin/login?error=link");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return to("/admin/login?error=link");

  return to(type === "invite" ? "/admin/set-password?welcome=1" : "/admin/set-password");
}
