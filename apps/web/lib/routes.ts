import { mangaHref } from "@/lib/slug";

/**
 * Single source of truth for every route in the web app — page paths AND the
 * native API endpoints we still reference as strings. Never hardcode a path in a
 * component/handler; import `routes` and read it from here. Dynamic routes are
 * functions; static ones are strings.
 *
 * (Backend HTTP routes live in the oRPC contract — `@packages/contracts` — which
 * is already the single source for that surface; the web's own oRPC procedures
 * are called type-safely via `rpc.*`, so they need no string here.)
 */
function qs(params?: Record<string, string | number | null | undefined>): string {
  if (!params) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null) sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const routes = {
  // ── Static pages ──
  home: "/",
  about: "/about",
  contact: "/contact",
  dmca: "/dmca",
  privacy: "/privacy",
  cookies: "/cookies",
  terms: "/terms",
  library: "/library",
  updates: "/atualizacoes",
  newsletter: "/newsletter",
  authAnilist: "/auth/anilist",
  authAnilistDone: "/auth/anilist/done",
  donate: "/doar",
  affiliate: "/affiliate",
  pixels: "/pixels",
  studio: "/studio",
  settings: "/settings",
  // auth
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",
  // learn
  learn: "/learn",
  learnPremium: "/learn/premium",
  learnReview: "/learn/review",
  // admin
  admin: {
    root: "/admin",
    users: "/admin/users",
    comments: "/admin/comments",
    donations: "/admin/donations",
    pixels: "/admin/pixels",
    affiliates: "/admin/affiliates",
  },

  // ── Dynamic pages ──
  manga: (id: string, name: string) => mangaHref(id, name),
  obra: (slug: string) => `/obra/${slug}`,
  obraChapter: (slug: string, chapterId: string | number) => `/obra/${slug}/${chapterId}`,
  user: (handle: string) => `/u/${handle}`,
  genre: (slug: string) => `/g/${slug}`,
  learnChapter: (id: string | number) => `/learn/${id}`,
  studioWork: (id: string | number) => `/studio/${id}`,
  studioPreview: (workId: string | number, chapterId: string | number) =>
    `/studio/${workId}/preview/${chapterId}`,
  read: (id: string | number, q?: { m?: string; mn?: string; n?: string }) => `/read/${id}${qs(q)}`,

  // ── Native API endpoints (the ones still hit as strings) ──
  api: {
    rpc: "/api/rpc",
    list: "/api/list",
    mangaSuggest: "/api/manga/suggest",
    img: "/api/img",
    proxy: "/api",
    learnExport: "/api/learn/export",
    webhooks: {
      donations: "/api/donations/webhook",
      pixels: "/api/pixels/webhook",
      subscribe: "/api/learn/subscribe/webhook",
    },
    newsletter: {
      confirm: "/api/newsletter/confirm",
      unsubscribe: "/api/newsletter/unsubscribe",
    },
    studio: {
      cover: (workId: string | number) => `/api/studio/works/${workId}/cover`,
      chapters: (workId: string | number) => `/api/studio/works/${workId}/chapters`,
      pages: (chapterId: string | number) => `/api/studio/chapters/${chapterId}/pages`,
    },
    profile: {
      banner: "/api/profile/banner",
      avatar: "/api/profile/avatar",
    },
  },
} as const;
