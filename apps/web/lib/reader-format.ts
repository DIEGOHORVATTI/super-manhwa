/**
 * Decide whether a chapter opens in the text (novel) reader or the page (manga)
 * reader. The chapter link's own format `f` wins; when the link didn't carry one
 * (a shared URL, an older history entry, or a connector that doesn't tag the
 * format) we fall back to the *work's* format. The reader page still self-heals
 * if this guess turns up no content (e.g. a twin work whose chapter is actually
 * the other format), so this only needs to be a good first guess.
 */
const KNOWN = new Set(["novel", "manga", "manhwa", "manhua"]);

export function shouldOpenNovel(
  chapterFormat: string | undefined | null,
  workFormat: string | undefined | null,
): boolean {
  if (chapterFormat && KNOWN.has(chapterFormat)) return chapterFormat === "novel";
  return workFormat === "novel";
}
