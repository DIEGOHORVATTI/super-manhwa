/**
 * SEO slug helpers for work URLs (`/manga/{id}/{slug}`).
 *
 * The `id` is the opaque backend identifier that still drives every data fetch;
 * the slug is purely a keyword-rich, human-readable tail for search engines and
 * shareable links. It also doubles as a name hint: `deslugify` reconstructs a
 * good-enough search query so the backend's name fallback survives clean URLs
 * (no more `?n=`).
 */

/** Title → URL slug: accent-stripped, lowercased, hyphenated. */
export const slugify = (s: string): string =>
  (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // strip diacritics (ç, ã, é…)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "manga"
  ).replace(/-+$/g, ""); // re-trim in case the 80-char clamp split a hyphen

/** Slug → search query: a lossy but usable inverse for the name fallback. */
export const deslugify = (slug: string): string => slug.replace(/-+/g, " ").trim();

/** Canonical path for a work. */
export const mangaHref = (id: string, name: string): string => `/manga/${id}/${slugify(name)}`;
