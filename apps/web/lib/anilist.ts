"use client";
import { useSyncExternalStore } from "react";

import type { LibEntry } from "./library";

/**
 * Optional AniList account sync (favourites only). OAuth2 **authorization code
 * grant** (AniList doesn't support implicit grant): the browser redirects to
 * AniList → comes back to `/auth/anilist?code=…` → a server route exchanges the
 * code for a token using the client secret (server-only) → hands the token to
 * the client via fragment, which stores it in localStorage. From there the
 * browser talks to `graphql.anilist.co` directly with the bearer token.
 *
 * The whole feature is gated on `NEXT_PUBLIC_ANILIST_CLIENT_ID`: unset → the UI
 * hides every AniList affordance and the app stays 100% local/anonymous.
 *
 * Our catalog ids ARE AniList media ids, so a favourite maps 1:1 with no lookup:
 * `mediaId = Number(entry.id)`.
 */
const CLIENT_ID = process.env.NEXT_PUBLIC_ANILIST_CLIENT_ID;
export const anilistConfigured = Boolean(CLIENT_ID);

const ENDPOINT = "https://graphql.anilist.co";
const KEY = "mr:anilist:v1";
const RETURN_KEY = "mr:anilist:return";
const EVENT = "mr-anilist-change";
const isClient = typeof window !== "undefined";

export type AniListSession = { token: string; expiresAt: number; name?: string };

/* ------------------------------- session store ---------------------------- */

function readSession(): AniListSession | null {
  if (!isClient) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as AniListSession;
    if (!s.token || s.expiresAt <= Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}

function writeSession(s: AniListSession | null): void {
  if (!isClient) return;
  if (s) window.localStorage.setItem(KEY, JSON.stringify(s));
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

let cached: { raw: string | null; session: AniListSession | null } = { raw: null, session: null };

function subscribe(cb: () => void): () => void {
  if (!isClient) return () => {};
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

function getSnapshot(): AniListSession | null {
  if (!isClient) return null;
  const raw = window.localStorage.getItem(KEY);
  if (raw === cached.raw) return cached.session;
  cached = { raw, session: readSession() };
  return cached.session;
}

export function useAniList(): {
  session: AniListSession | null;
  isLoggedIn: boolean;
  configured: boolean;
  login: () => void;
  logout: () => void;
} {
  const session = useSyncExternalStore(subscribe, getSnapshot, () => null);
  return {
    session,
    isLoggedIn: Boolean(session),
    configured: anilistConfigured,
    login,
    logout: () => writeSession(null),
  };
}

/* --------------------------------- oauth flow ----------------------------- */

function login(): void {
  if (!isClient || !CLIENT_ID) return;
  // Remember where to return after the redirect dance.
  window.sessionStorage.setItem(RETURN_KEY, window.location.pathname + window.location.search);
  const redirect = `${window.location.origin}/auth/anilist`;
  const url = `https://anilist.co/api/v2/oauth/authorize?client_id=${encodeURIComponent(
    CLIENT_ID,
  )}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code`;
  window.location.href = url;
}

/** Where to send the user back to after a successful callback. */
export function consumeReturnPath(): string {
  if (!isClient) return "/biblioteca";
  const p = window.sessionStorage.getItem(RETURN_KEY);
  window.sessionStorage.removeItem(RETURN_KEY);
  return p || "/biblioteca";
}

/**
 * Parse the implicit-grant fragment (`#access_token=…&expires_in=…`), persist the
 * session, then best-effort fetch the viewer's name. Returns success.
 */
export async function completeAuthFromHash(hash: string): Promise<boolean> {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const token = params.get("access_token");
  if (!token) return false;
  const expiresIn = Number(params.get("expires_in") ?? 0);
  const expiresAt =
    Date.now() +
    (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn * 1000 : 365 * 24 * 3600 * 1000);
  writeSession({ token, expiresAt });
  try {
    const data = await request<{ Viewer: { name: string } }>(
      "query { Viewer { name } }",
      {},
      token,
    );
    writeSession({ token, expiresAt, name: data.Viewer?.name });
  } catch {
    /* name is cosmetic — keep the session even if it fails */
  }
  return true;
}

/* --------------------------------- graphql -------------------------------- */

async function request<T>(
  query: string,
  variables: Record<string, unknown>,
  token?: string,
): Promise<T> {
  const auth = token ?? readSession()?.token;
  if (!auth) throw new Error("not authenticated with AniList");
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${auth}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (res.status === 401) {
    writeSession(null);
    throw new Error("AniList session expired");
  }
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  if (!json.data) throw new Error("empty AniList response");
  return json.data;
}

interface MediaNode {
  id: number;
  title?: { romaji?: string; english?: string; native?: string; userPreferred?: string };
  coverImage?: { large?: string };
}

const displayTitle = (m: MediaNode): string =>
  m.title?.english ?? m.title?.romaji ?? m.title?.userPreferred ?? m.title?.native ?? `#${m.id}`;

/** The viewer's favourited manga → local library entry shape. */
export async function fetchFavourites(): Promise<LibEntry[]> {
  const data = await request<{
    Viewer: { favourites: { manga: { nodes: MediaNode[] } } };
  }>(
    `query {
      Viewer {
        favourites {
          manga(perPage: 50) {
            nodes { id title { romaji english native userPreferred } coverImage { large } }
          }
        }
      }
    }`,
    {},
  );
  const nodes = data.Viewer?.favourites?.manga?.nodes ?? [];
  return nodes.map((m) => ({
    id: String(m.id),
    name: displayTitle(m),
    imageUrl: m.coverImage?.large,
    addedAt: Date.now(),
  }));
}

/** Toggle a manga's favourite state on AniList. No-op for non-numeric ids. */
export async function toggleFavourite(id: string): Promise<void> {
  const mediaId = Number(id);
  if (!Number.isFinite(mediaId)) return;
  await request(
    `mutation ($id: Int) { ToggleFavourite(mangaId: $id) { manga { pageInfo { total } } } }`,
    {
      id: mediaId,
    },
  );
}
