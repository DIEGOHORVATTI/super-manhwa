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

/**
 * The real chapter number parsed from its (inconsistent) name — mirrors the
 * backend merge logic: drop volume, prefer a ch/cap/# marker, else first number.
 * Undefined when the name carries no number (e.g. "Prólogo").
 */
export const parseChapterNumber = (name: string): number | undefined => {
  const cleaned = name.replace(/vol(?:ume)?\.?\s*\d+(?:[.,]\d+)?/gi, " ");
  const marker = cleaned.match(/(?:ch(?:apter)?|cap(?:[íi]tulo)?|#)\s*\.?\s*(\d+(?:[.,]\d+)?)/i);
  const raw = marker?.[1] ?? cleaned.match(/(\d+(?:[.,]\d+)?)/)?.[1];
  if (!raw) return undefined;
  const n = Number.parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};
