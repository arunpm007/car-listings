import { type NextRequest, NextResponse } from "next/server";

// Old address in invite and reset emails: send them on to the Continue page, which uses the
// one-time token only when the person taps the button.
export function GET(request: NextRequest) {
  const url = new URL("/admin/auth/continue", request.url);
  for (const key of ["token_hash", "type"]) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}
