import { type NextRequest, NextResponse } from "next/server";

import { normalizeCode, REF_COOKIE, REF_COOKIE_MAX_AGE_S } from "@/lib/affiliate";

/**
 * Edge proxy (Next 16 "proxy" convention | the renamed middleware). First-touch
 * affiliate attribution: when a visitor lands with `?ref=CODE` and has no `ref`
 * cookie yet, persist the code for 30 days (signup turns it into a referral).
 * First touch wins; we never overwrite an existing cookie.
 */
export function proxy(request: NextRequest): NextResponse {
  const response = NextResponse.next();

  // First-touch affiliate code | never overwrite an existing cookie.
  const ref = normalizeCode(request.nextUrl.searchParams.get("ref"));
  if (ref && !request.cookies.get(REF_COOKIE)) {
    response.cookies.set(REF_COOKIE, ref, {
      maxAge: REF_COOKIE_MAX_AGE_S,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}

export const config = {
  // Run on page navigations only | skip API routes, Next internals and assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
