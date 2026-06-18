import type { WorkFormat } from "@packages/contracts";
import type { MangaConnector } from "@packages/extension";

import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";

import type { MangaSummary } from "../domain/manga";
import type { ConnectorRegistry } from "../infrastructure/connector-registry";
import { MangaMapper } from "../infrastructure/manga-mapper";
import { normName, orderCompletenessPool } from "./completeness";

const PREFERRED_LANG = "pt-br";
/** Bounded so autocomplete stays snappy | fastest (non-CF) sources only. */
const POOL = 3;
const PER_SOURCE_TTL = 10 * 60 * 1000;
const PER_SOURCE_HITS = 4;
const DEADLINE_MS = 3500;

/**
 * Search the actual reading sources (connectors), not the AniList catalog. This
 * is what makes a work findable when AniList indexes it poorly or not at all
 * (e.g. "The Beginning After the End" | only the anime is on AniList, but the
 * manhwa is on Manga Livre and the novel on CentralNovel).
 *
 * Cloudflare sources (FlareSolverr round-trips) are skipped here | too slow for
 * the autocomplete path. Each source is searched in parallel under a soft
 * deadline; per-source results are cached so a refined keystroke is instant.
 * Results are deduped by normalized title and carry opaque connector ids, so
 * opening one resolves straight from its source (cover/format/chapters included).
 */
export const makeConnectorSearch =
  (registry: ConnectorRegistry, idStore: IdStore, cache: Cache) =>
  async (
    q: string,
    opts: { limit?: number; deadlineMs?: number } = {},
  ): Promise<MangaSummary[]> => {
    const query = q.trim();
    if (!query) return [];
    const limit = opts.limit ?? 10;

    // Novel sources are the unique discovery value (and aren't in the manga
    // completeness priority, so they'd sort last and get sliced off) | always
    // include them, plus the top image sources. All non-CF to stay snappy.
    const fast = registry.listCurated().filter((c) => !c.hasCloudflare);
    const novels = fast.filter((c) => c.format === "novel");
    const images = orderCompletenessPool(
      fast.filter((c) => c.format !== "novel"),
      PREFERRED_LANG,
      "",
    ).slice(0, POOL);
    const pool = [...images, ...novels];
    if (pool.length === 0) return [];

    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<MangaSummary[]>((resolve) => {
      timer = setTimeout(() => resolve([]), opts.deadlineMs ?? DEADLINE_MS);
    });

    const searchOne = async (c: MangaConnector): Promise<MangaSummary[]> => {
      const lang = c.langs.includes(PREFERRED_LANG) ? PREFERRED_LANG : c.langs[0];
      try {
        const r = await cache.remember(
          `search:${c.id}:${lang}:${query.toLowerCase()}`,
          PER_SOURCE_TTL,
          () => c.search(query, 1, lang),
        );
        return (r.list ?? [])
          .slice(0, PER_SOURCE_HITS)
          .map((it) => MangaMapper.toSummary(idStore, c, it, lang));
      } catch {
        return [];
      }
    };

    const settled = await Promise.all(pool.map((c) => Promise.race([searchOne(c), deadline])));
    clearTimeout(timer);

    // Dedupe by title AND format | two manga sources with the same title collapse,
    // but a same-titled novel edition (e.g. CentralNovel "Solo Leveling") must
    // survive so the merge step can group it and surface the "novel" format.
    const seen = new Set<string>();
    const out: MangaSummary[] = [];
    for (const arr of settled) {
      for (const s of arr) {
        const k = `${normName(s.name)}::${s.format ?? "manga"}`;
        if (!normName(s.name) || seen.has(k)) continue;
        seen.add(k);
        out.push(s);
        if (out.length >= limit) return out;
      }
    }
    return out;
  };

export type ConnectorSearch = ReturnType<typeof makeConnectorSearch>;

/**
 * Format-edition markers a source appends to distinguish a novel/comic edition
 * of the same work (e.g. "Solo Leveling (Book Version)"). Stripped so the two
 * editions collapse to one base title for grouping. Conservative | only these
 * exact qualifiers in brackets, or a trailing "- novel", so sequels/side-stories
 * ("…: Ragnarok", "…(Pre-serialization)") stay distinct works.
 */
const FORMAT_MARKER =
  /\s*[([]\s*(?:book version|novel version|original novel|light novel|web ?novel|web ?comic|webtoon|manhwa|manhua|novel|comic|manga|ln|wn)\s*[)\]]|\s*[-–—]\s*(?:light novel|web ?novel|novel)\s*$/gi;

const baseTitle = (name: string): string => normName(name.replace(FORMAT_MARKER, " "));

const isNovel = (s: MangaSummary): boolean => s.format === "novel";
/** image editions (manga/manhwa/manhua/undefined) are what the search row opens. */
const formatOf = (s: MangaSummary): WorkFormat => s.format ?? "manga";

/**
 * Merge AniList + connector summaries into one row per work, ranked by relevance
 * to the query. Two jobs:
 *  - Relevance: without it, AniList's fuzzy matches (e.g. "ATOM: The Beginning"
 *    for "the beginning") fill every slot and bury the exact hit. Rank: base
 *    title starts with the query (0) → contains it (1) → neither (2).
 *  - Grouping: format-editions of one work (manhwa + "(Book Version)" novel)
 *    collapse to a single row | the image edition is shown (opening it reaches
 *    the other via the page's format switcher), and `formats` lists what's
 *    available so the row can badge "Mangá · Novel". A novel-only work stays
 *    (its novel edition is the row), so nothing readable is dropped.
 */
export const mergeSummaries = (
  query: string,
  anilist: MangaSummary[],
  connector: MangaSummary[],
  limit: number,
): MangaSummary[] => {
  const nq = normName(query);
  const rankOf = (s: MangaSummary): number => {
    const base = baseTitle(s.name);
    const full = normName(s.name);
    if (base.startsWith(nq) || full.startsWith(nq)) return 0;
    if (base.includes(nq) || full.includes(nq)) return 1;
    return 2;
  };

  type Group = { primary: MangaSummary; formats: Set<WorkFormat>; rank: number; order: number };
  const groups = new Map<string, Group>();
  // AniList first (source order) so it wins ties as the shown edition.
  [...anilist, ...connector].forEach((s, order) => {
    const key = baseTitle(s.name);
    if (!key) return;
    const rank = rankOf(s);
    const g = groups.get(key);
    if (!g) {
      groups.set(key, { primary: s, formats: new Set([formatOf(s)]), rank, order });
      return;
    }
    g.formats.add(formatOf(s));
    // Prefer an image edition as the row the user opens (its switcher finds the novel).
    if (isNovel(g.primary) && !isNovel(s)) g.primary = s;
    if (rank < g.rank) g.rank = rank;
  });

  return [...groups.values()]
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .slice(0, limit)
    .map(({ primary, formats }) => {
      if (formats.size < 2) return primary;
      // image-first so the badge reads e.g. "Mangá · Novel".
      const ordered = [...formats].sort(
        (a, b) => (a === "novel" ? 1 : 0) - (b === "novel" ? 1 : 0),
      );
      return { ...primary, formats: ordered };
    });
};
