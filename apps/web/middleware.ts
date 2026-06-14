import { type NextRequest, NextResponse } from "next/server";

import { normalizeCode, REF_COOKIE, REF_COOKIE_MAX_AGE_S } from "@/lib/affiliate";

/**
 * First-touch affiliate attribution. When a visitor lands with `?ref=CODE` and
 * has no `ref` cookie yet, we persist the code for 30 days; signup then turns it
 * into a referral. First touch wins (we never overwrite an existing cookie).
 */
export function middleware(req: NextRequest) {
  const ref = normalizeCode(req.nextUrl.searchParams.get("ref"));
  if (!ref || req.cookies.get(REF_COOKIE)) return NextResponse.next();

  const res = NextResponse.next();
  res.cookies.set(REF_COOKIE, ref, {
    maxAge: REF_COOKIE_MAX_AGE_S,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return res;
}

// Skip Next internals, API routes and static files.
export const config = {
  matcher: ["/((?!_next/|api/|favicon|.*\\..*).*)"],
};
