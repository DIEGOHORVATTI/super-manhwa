import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

import { normalizeCode, REF_COOKIE, REF_COOKIE_MAX_AGE_S } from "@/lib/affiliate";
import { SESSION_COOKIE, SESSION_MAX_AGE_S } from "@/lib/session-cookie";

/**
 * Edge proxy (Next 16 "proxy" convention — the renamed middleware). Two tiny,
 * cache-safe concerns on page navigations:
 *
 *  1. Anonymous session id (`mr_sid`) — binds signed chapter-page image URLs to
 *     this browser. When missing we also inject it into THIS request's headers so
 *     the same render's RSC (`getSessionId`) signs pages with the id the browser
 *     will then send back; otherwise a brand-new visitor landing straight on a
 *     reader URL would sign with an empty id and 403 their own images.
 *  2. First-touch affiliate attribution — when a visitor lands with `?ref=CODE`
 *     and has no `ref` cookie yet, persist the code for 30 days (signup turns it
 *     into a referral). First touch wins; we never overwrite an existing cookie.
 *
 * Excludes `/api/*` and assets (see matcher): images must NOT mint a session — a
 * cookieless direct hit (incognito link-paste) should fail verification.
 */
export function proxy(request: NextRequest): NextResponse {
  const sid = request.cookies.get(SESSION_COOKIE)?.value ? null : crypto.randomUUID();

  // A freshly-minted session id is injected into this request's headers so the
  // current RSC render signs image URLs with the id the browser will send back.
  let response: NextResponse;
  if (sid) {
    const headers = new Headers(request.headers);
    const existing = headers.get("cookie");
    headers.set(
      "cookie",
      existing ? `${existing}; ${SESSION_COOKIE}=${sid}` : `${SESSION_COOKIE}=${sid}`,
    );
    response = NextResponse.next({ request: { headers } });
    response.cookies.set(SESSION_COOKIE, sid, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_S,
    });
  } else {
    response = NextResponse.next();
  }

  // First-touch affiliate code — never overwrite an existing cookie.
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
  // Run on page navigations only — skip API routes, Next internals and assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
