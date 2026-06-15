import { NextResponse } from "next/server";
import { routes } from "@/lib/routes";
import { env } from "@/lib/env";

/**
 * AniList OAuth callback (authorization code grant). AniList redirects here with
 * `?code=…`; we exchange it for an access token server-side (the client secret
 * never reaches the browser), then hand the token to the client via a fragment
 * on /auth/anilist/done, which stores it in localStorage. Tokens in the fragment
 * aren't sent to servers / logged.
 *
 * The redirect_uri here MUST exactly match the one used to start the flow and
 * the one registered on the AniList client (`${origin}/auth/anilist`).
 */
const TOKEN_URL = "https://anilist.co/api/v2/oauth/token";

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const done = (frag: string) =>
    NextResponse.redirect(new URL(`${routes.authAnilistDone}${frag}`, url.origin));

  if (!code) return done("#error=denied");

  const clientId = env.NEXT_PUBLIC_ANILIST_CLIENT_ID;
  const clientSecret = env.ANILIST_CLIENT_SECRET;
  if (!clientId || !clientSecret) return done("#error=unconfigured");

  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${url.origin}/auth/anilist`,
        code,
      }),
    });
    const json = (await res.json()) as TokenResponse;
    if (!res.ok || !json.access_token) return done("#error=exchange");
    const params = new URLSearchParams({
      access_token: json.access_token,
      expires_in: String(json.expires_in ?? ""),
    });
    return done(`#${params.toString()}`);
  } catch {
    return done("#error=network");
  }
}
