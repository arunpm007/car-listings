"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { DAY, HOUR, clientIpHash, withinLimits } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

/**
 * Sends a reset link if the address belongs to an account. The answer is the same either way,
 * so the form can't be used to find out who the admins are.
 */
export async function requestPasswordReset(email: string) {
  const parsed = z.email().max(200).safeParse(email.trim());
  // Limits keep strangers from spending the email allowance that real invites and resets need.
  const allowed =
    parsed.success &&
    (await withinLimits([
      [`reset:ip:${await clientIpHash()}`, 3, HOUR],
      [`reset:email:${parsed.data.toLowerCase()}`, 3, DAY],
      ["reset:all", 10, HOUR],
    ]));
  if (parsed.success && allowed) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data);
    if (error) console.error("password reset email failed", error.message);
  }
  return { ok: true as const };
}

/** The Continue button on invite and reset links: uses the one-time token, then on to the password. */
export async function confirmEmailLink(form: FormData) {
  const tokenHash = String(form.get("token_hash") ?? "");
  const type = form.get("type");
  if (!tokenHash || (type !== "invite" && type !== "recovery")) redirect("/admin/login?error=link");
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) redirect("/admin/login?error=link");
  redirect(type === "invite" ? "/admin/set-password?welcome=1" : "/admin/set-password");
}
