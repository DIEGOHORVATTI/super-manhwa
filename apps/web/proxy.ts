import { type NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE, SESSION_MAX_AGE_S } from "@/lib/session-cookie";

/**
 * Mint an anonymous session id on first visit. Kept deliberately tiny: it only
 * touches the `mr_sid` cookie (used to bind signed chapter-page image URLs to
 * this browser) and never varies the HTML cache. When the cookie is missing we
 * also inject it into THIS request's headers so the same render's RSC
 * (`getSessionId`) signs pages with the id the browser will then send back —
 * otherwise a brand-new visitor landing straight on a reader URL would sign
 * with an empty id and 403 their own images.
 *
 * Excludes `/api/*` and assets (see matcher): images must NOT mint a session —
 * a cookieless direct hit (incognito link-paste) should fail verification.
 *
 * (Next 16 "proxy" convention — the renamed middleware.)
 */
export function proxy(request: NextRequest): NextResponse {
  if (request.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();

  const sid = crypto.randomUUID();
  const headers = new Headers(request.headers);
  const existing = headers.get("cookie");
  headers.set(
    "cookie",
    existing ? `${existing}; ${SESSION_COOKIE}=${sid}` : `${SESSION_COOKIE}=${sid}`,
  );

  const response = NextResponse.next({ request: { headers } });
  response.cookies.set(SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
  return response;
}

export const config = {
  // Run on page navigations only — skip API routes, Next internals and assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
