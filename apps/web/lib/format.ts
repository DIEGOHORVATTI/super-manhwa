/** Days a chapter counts as "new" after its upload. */
export const NEW_FOR_DAYS = 6;

const toMs = (ms?: string): number | undefined => {
  if (!ms) return undefined;
  const n = Number(ms);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/**
 * Compact date for a chapter's unix-ms-string upload time, e.g. "12 mai 2025".
 * Formatted in UTC so it renders identically on server and client (no hydration
 * mismatch). Undefined when the source gave no timestamp.
 */
export const fmtChapterDate = (ms?: string): string | undefined => {
  const n = toMs(ms);
  if (n === undefined) return undefined;
  const parts = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(new Date(n));
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("day")} ${part("month").replace(".", "")} ${part("year")}`;
};

/** True when the upload timestamp falls within the last {@link NEW_FOR_DAYS} days. */
export const isRecent = (ms?: string, days = NEW_FOR_DAYS): boolean => {
  const n = toMs(ms);
  return n !== undefined && Date.now() - n < days * 86_400_000;
};
