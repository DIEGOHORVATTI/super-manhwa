import { translatePt } from "./translate";

const norm = (s: string) => s.normalize("NFKC").trim().toLowerCase();

/**
 * Cross-language title set for the detail page. Combines the work's official
 * variants (english / romaji / native / synonyms | which already include
 * localized names such as the pt-BR title) with a machine pt-BR translation of
 * the primary title, so the obra is found whether a reader searches its English,
 * native, or Portuguese name. The translation is cached 30d and a no-op for
 * proper nouns simply dedupes away, so nothing junky leaks in.
 *
 * Excludes the primary display title and dedupes case-insensitively.
 */
export async function buildAltTitles(title: string, aliases: string[]): Promise<string[]> {
  const ptTitle = await translatePt(title); // falls back to `title` on failure → deduped out
  const seen = new Set([norm(title)]);
  const out: string[] = [];
  for (const candidate of [...aliases, ptTitle]) {
    const v = (candidate ?? "").trim();
    if (!v) continue;
    const k = norm(v);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out.slice(0, 12);
}
