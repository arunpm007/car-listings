"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Sends a reset link if the address belongs to an account. The answer is the same either way,
 * so the form can't be used to find out who the admins are.
 */
export async function requestPasswordReset(email: string) {
  const parsed = z.email().max(200).safeParse(email.trim());
  if (parsed.success) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data);
    if (error) console.error("password reset email failed", error.message);
  }
  return { ok: true as const };
}
