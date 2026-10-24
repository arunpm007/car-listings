import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// A production build without these would quietly point share links and the security policy at
// localhost, so stop the build instead. `next typegen` (run by `pnpm typecheck`) loads this file
// the same way but builds nothing, so it's let through.
if (process.env.NODE_ENV === "production" && !process.argv.includes("typegen")) {
  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SITE_URL"]) {
    if (!process.env[name]) throw new Error(`${name} must be set for a production build`);
  }
}
// Photos, uploads and sign-in all go to Supabase, so it's the one outside origin the pages may use.
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

const csp = [
  "default-src 'self'",
  // Next.js puts its page data in inline scripts; no script from any other site may run.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: ${supabase}`,
  "font-src 'self'",
  `connect-src 'self' ${supabase}`,
  // The admin's document viewer shows PDFs from Supabase in a frame.
  `frame-src 'self' ${supabase}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Nobody may show this site inside their own page (stops clickjacking the admin).
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  agentRules: false,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // Admin pages are personal: never keep them in a shared cache.
      { source: "/admin/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
