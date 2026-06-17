import type {
  Chapter,
  Health,
  MangaCore,
  MangaList,
  MangaSort,
  MangaSummary,
} from "@packages/contracts";

/**
 * Tiny typed HTTP client for the e2e suite. We intentionally hit the live
 * backend over HTTP (not in-process) so tests exercise the real network +
 * X-API-KEY guard + same routing the frontend uses.
 *
 * Prerequisites:
 *   - Backend reachable at `TEST_BACKEND_URL` (default http://localhost:8787)
 *   - `API_KEY` set in the test process env (use `.env` or shell export)
 */
const BACKEND = process.env.TEST_BACKEND_URL ?? "http://localhost:8787";
const API_KEY = process.env.API_KEY ?? "dev-api-key-change-in-prod";

const headers = (override?: Record<string, string>) => ({
  "X-API-KEY": API_KEY,
  ...override,
});

const getJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${BACKEND}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${path}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
};

export const apiClient = {
  url: BACKEND,
  apiKey: API_KEY,

  health: () => getJson<Health>("/api/health"),

  manga: {
    popular: (params: { lang?: string; page?: number; genre?: string; sort?: MangaSort } = {}) => {
      const sp = new URLSearchParams();
      if (params.lang) sp.set("lang", params.lang);
      if (params.page) sp.set("page", String(params.page));
      if (params.genre) sp.set("genre", params.genre);
      if (params.sort) sp.set("sort", params.sort);
      const qs = sp.toString();
      return getJson<MangaList>(`/api/manga/popular${qs ? `?${qs}` : ""}`);
    },
    search: (params: { q: string; lang?: string; page?: number }) => {
      const sp = new URLSearchParams({ q: params.q });
      if (params.lang) sp.set("lang", params.lang);
      if (params.page) sp.set("page", String(params.page));
      return getJson<MangaList>(`/api/manga/search?${sp}`);
    },
    suggest: (params: { q: string; lang?: string }) => {
      const sp = new URLSearchParams({ q: params.q });
      if (params.lang) sp.set("lang", params.lang);
      return getJson<{ list: MangaSummary[] }>(`/api/manga/suggest?${sp}`);
    },
    core: (params: { id: string; name?: string }) => {
      const sp = new URLSearchParams({ id: params.id });
      if (params.name) sp.set("name", params.name);
      return getJson<{ core: MangaCore; lang: string }>(`/api/manga/core?${sp}`);
    },
    chapters: (params: { id: string; name?: string }) => {
      const sp = new URLSearchParams({ id: params.id });
      if (params.name) sp.set("name", params.name);
      return getJson<{ chapters: Chapter[]; lang: string }>(`/api/manga/chapters?${sp}`);
    },
    pages: (id: string) =>
      getJson<{ pages: string[] }>(`/api/manga/pages?id=${encodeURIComponent(id)}`),
    langs: () => getJson<{ langs: string[] }>("/api/manga/langs"),
    genres: (lang?: string) =>
      getJson<{ genres: string[] }>(`/api/manga/genres${lang ? `?lang=${lang}` : ""}`),
  },

  /** Raw image proxy fetch | returns the Response so the caller can inspect bytes. */
  image: (token: string, opts: { withKey?: boolean } = { withKey: true }) =>
    fetch(`${BACKEND}/api/img/${token}`, {
      headers: opts.withKey ? headers() : undefined,
    }),

  /** Raw unauthenticated request | used by auth tests. */
  rawGet: (path: string, init?: RequestInit) => fetch(`${BACKEND}${path}`, init),
};
