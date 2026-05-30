import type { Chapter } from "../domain/manga";

/**
 * Pure helpers for cross-source chapter completeness — kept side-effect-free so
 * the merge/dedup/match logic is unit-testable without a live registry.
 *
 * The problem they solve: a single connector often returns only a *partial*
 * chapter list (MangaDex pt-br exposes only pt-br-translated chapters — e.g. 5
 * of ~270 for Solo Leveling). To list every chapter we fan out across several
 * connectors and union their results, preferring the request language per
 * chapter and falling through to other languages to fill the gaps.
 */

/** Accent/punctuation-insensitive, lowercased token string. */
export const normName = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Articles/particles that add noise to title matching across languages.
const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "of",
  "to",
  "o",
  "os",
  "as",
  "de",
  "da",
  "do",
  "dos",
  "das",
  "um",
  "uma",
  "el",
  "la",
  "los",
  "las",
]);

const tokenSet = (s: string): Set<string> =>
  new Set(
    normName(s)
      .split(" ")
      .filter((t) => t && !STOPWORDS.has(t)),
  );

const jaccard = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
};

/**
 * Whether `candidate` is the same work as any of `targets` (the primary name
 * plus cross-language aliases). Exact normalized match, or high token overlap.
 * The 0.7 floor is deliberately strict so sequels/spin-offs ("Solo Leveling"
 * vs "Solo Leveling: Ragnarok", 0.67) don't substitute the wrong title.
 */
export const titleMatches = (candidate: string, targets: string[]): boolean => {
  const cand = tokenSet(candidate);
  const candNorm = normName(candidate);
  for (const t of targets) {
    if (!t) continue;
    if (candNorm === normName(t)) return true;
    if (jaccard(cand, tokenSet(t)) >= 0.7) return true;
  }
  return false;
};

/**
 * Extract a chapter's numeric index from its (wildly inconsistent) name so the
 * same chapter from two sources collapses to one entry. Volume tokens are
 * stripped first ("Vol.1 Ch.5" → 5); explicit chapter markers win, with a
 * bare-number fallback. Returns undefined for oneshots/specials.
 */
export const parseChapterNumber = (name: string): number | undefined => {
  const cleaned = name.replace(/vol(?:ume)?\.?\s*\d+(?:[.,]\d+)?/gi, " ");
  const marker = cleaned.match(/(?:ch(?:apter)?|cap(?:[íi]tulo)?|#)\s*\.?\s*(\d+(?:[.,]\d+)?)/i);
  const raw = marker?.[1] ?? cleaned.match(/(\d+(?:[.,]\d+)?)/)?.[1];
  if (!raw) return undefined;
  const n = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Connector preference for chapter completeness, deepest catalogs first. The
 * pt-br aggregators (Comick ~270 ch, Mangafire) outrank MangaDex pt-br, whose
 * language-filtered feed is usually the most truncated. Unlisted ids sort last.
 */
export const COMPLETENESS_PRIORITY = [
  "mangadex-ptbr",
  "mangalivre-to",
  "mangalivre-blog",
  "mangafire-ptbr",
  "comick-ptbr",
  "mangadex",
  "weebcentral",
  "manhwaz",
  "webtoons",
  "mangaworld",
  "asurascans",
];

export const priorityOf = (id: string): number => {
  const i = COMPLETENESS_PRIORITY.indexOf(id);
  return i === -1 ? COMPLETENESS_PRIORITY.length : i;
};

/**
 * Order connectors for a completeness fan-out: same-language sources first
 * (they need no translation match), then by catalog-depth priority. Unlike the
 * popular/search pools this does NOT drop Cloudflare sources — Comick/Mangafire
 * hold the deepest pt-br catalogs and are reachable by id via FlareSolverr.
 */
export const orderCompletenessPool = <T extends { id: string; lang: string }>(
  connectors: readonly T[],
  primaryLang: string,
  excludeId: string,
): T[] =>
  connectors
    .filter((c) => c.id !== excludeId)
    .sort((a, b) => {
      const al = a.lang === primaryLang ? 0 : 1;
      const bl = b.lang === primaryLang ? 0 : 1;
      return al - bl || priorityOf(a.id) - priorityOf(b.id);
    });

export type ChapterSource = {
  /** Source language of every chapter in this batch. */
  lang: string;
  /** Lower = higher priority when the same chapter number appears twice. */
  priority: number;
  chapters: Chapter[];
};

/**
 * Union chapters across sources, deduped by parsed chapter number. For a
 * duplicate number we keep the variant in `primaryLang` first, then the
 * highest-priority source — so the reader opens the request-language chapter
 * when it exists, and a fallback-language one only to fill gaps. Chapters with
 * no parseable number (oneshots) are kept, deduped by name.
 */
export const mergeChapters = (sources: ChapterSource[], primaryLang: string): Chapter[] => {
  // Primary-language sources first (so first-wins prefers them), then others.
  const ordered = [...sources].sort((a, b) => {
    const al = a.lang === primaryLang ? 0 : 1;
    const bl = b.lang === primaryLang ? 0 : 1;
    return al - bl || a.priority - b.priority;
  });

  const byNumber = new Map<string, { ch: Chapter; n: number }>();
  const byName = new Map<string, Chapter>();
  for (const src of ordered) {
    for (const ch of src.chapters) {
      const n = parseChapterNumber(ch.name);
      if (n === undefined) {
        const key = normName(ch.name) || ch.id;
        if (!byName.has(key)) byName.set(key, ch);
      } else {
        const key = String(n);
        if (!byNumber.has(key)) byNumber.set(key, { ch, n });
      }
    }
  }

  const numbered = [...byNumber.values()].sort((a, b) => b.n - a.n).map((e) => e.ch);
  return [...numbered, ...byName.values()];
};
