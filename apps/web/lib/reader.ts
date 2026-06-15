import type { Chapter } from "@packages/contracts";

import { routes } from "@/lib/routes";

/**
 * Reader chapter navigation helpers, shared by the sticky top toolbar
 * (ReaderNav) and the end-of-chapter footer (ReaderChapterEnd) so both compute
 * prev/next identically.
 *
 * Detail returns chapters newest-first, so in reading direction "anterior"
 * (previous, lower number) is the NEXT index and "próximo" is the PREVIOUS index.
 */
export function chapterNav(chapters: Chapter[], currentId: string) {
  const idx = chapters.findIndex((c) => c.id === currentId);
  const prev = idx >= 0 && idx < chapters.length - 1 ? chapters[idx + 1] : null;
  const next = idx > 0 ? chapters[idx - 1] : null;
  return { idx, prev, next, current: idx >= 0 ? chapters[idx] : null };
}

export function chapterHref(c: Chapter, mangaId: string, mangaName: string) {
  return routes.read(c.id, { m: mangaId, mn: mangaName, n: c.name });
}
