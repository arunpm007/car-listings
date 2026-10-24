import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createServiceClient } from "./supabase/service";

/**
 * A salted one-way code for a phone number, email or address: the same input always gives the
 * same code, so it can be counted, but the code can't be turned back into the input.
 */
export function scramble(value: string) {
  return createHash("sha256").update(`${value}:${process.env.SUPABASE_SECRET_KEY}`).digest("hex").slice(0, 32);
}

/**
 * The visitor's address, scrambled so it can be stored without keeping the address.
 *
 * Only a header the host itself sets can be trusted; anything else a visitor can type in.
 * Set CLIENT_IP_HEADER to the one your host uses (Cloudflare: cf-connecting-ip,
 * Netlify: x-nf-client-connection-ip, Vercel: x-real-ip). Without it, the last entry of
 * x-forwarded-for is used: proxies add that one, so it is the address they saw.
 */
export async function clientIpHash() {
  const h = await headers();
  const trusted = process.env.CLIENT_IP_HEADER?.toLowerCase();
  const forwarded = h.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  const ip = (trusted ? h.get(trusted) : forwarded?.at(-1)) || "unknown";
  return scramble(ip);
}

/** Counts one hit against `bucket`; false once it has had `max` in the last `windowSecs`. */
export async function takeRateLimit(bucket: string, max: number, windowSecs: number) {
  const { data, error } = await createServiceClient().rpc("take_rate_limit", { bucket, max_hits: max, window_secs: windowSecs });
  if (error) {
    // Fail closed: a broken limit must not open the form to floods.
    console.error("rate limit check failed", error.message);
    return false;
  }
  return data === true;
}

export const HOUR = 60 * 60;
export const DAY = 24 * HOUR;

/** All the limits for one action, checked in order; stops at the first one that's full. */
export async function withinLimits(limits: [bucket: string, max: number, windowSecs: number][]) {
  for (const [bucket, max, windowSecs] of limits) {
    if (!(await takeRateLimit(bucket, max, windowSecs))) return false;
  }
  return true;
}

