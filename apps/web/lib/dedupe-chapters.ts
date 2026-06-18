import { parseChapterNumber } from "@/lib/format";

type Chapterish = { id: string; name: string; dateUpload?: string };

/**
 * Collapse chapters that share a chapter number, keeping the entry that has a
 * date (the real reader chapter) over a dateless dupe (the broken `/pdf/` row a
 * stale cache may still carry). Insertion order is preserved. Chapters with no
 * parseable number (oneshots/specials) key off their id, so they never collapse.
 *
 * Manga lists are already merged by number upstream, so this is a no-op there |
 * it exists to heal stale/duplicated novel lists at the display layer.
 */
export function dedupeChapters<T extends Chapterish>(chapters: T[]): T[] {
  const byKey = new Map<string, T>();
  for (const c of chapters) {
    const num = parseChapterNumber(c.name);
    const key = num === undefined ? `id:${c.id}` : `n:${num}`;
    const existing = byKey.get(key);
    if (!existing || (!existing.dateUpload && c.dateUpload)) byKey.set(key, c);
  }
  return [...byKey.values()];
}
