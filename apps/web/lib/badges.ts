/**
 * Badge catalog + resolver — pure, no DB/server-only, so it's usable in client
 * components (comment authors, profile) and unit-tested. A user's badges come
 * from their role, plan and unlocked achievement keys.
 *
 * `tone` drives the color and which surfaces show it: chat shows only the
 * "status" tones (admin/staff/premium); the profile shows everything.
 */
export type BadgeTone = "admin" | "staff" | "premium" | "lang" | "reading";

export interface Badge {
  key: string;
  label: string;
  tone: BadgeTone;
}

/** Achievement-key → badge label + tone (shared with gamification unlock keys). */
export const ACHIEVEMENT_BADGES: Record<string, { label: string; tone: BadgeTone }> = {
  // Language learning
  words_100: { label: "100 palavras", tone: "lang" },
  words_1000: { label: "1.000 palavras", tone: "lang" },
  streak_7: { label: "7 dias seguidos", tone: "lang" },
  streak_30: { label: "30 dias seguidos", tone: "lang" },
  first_chapter: { label: "Primeiro capítulo", tone: "lang" },
  // Reading
  read_10_works: { label: "10 obras lidas", tone: "reading" },
  read_50_works: { label: "50 obras lidas", tone: "reading" },
  read_100_chapters: { label: "100 capítulos", tone: "reading" },
  read_500_chapters: { label: "500 capítulos", tone: "reading" },
};

const STATUS_TONES: ReadonlySet<BadgeTone> = new Set(["admin", "staff", "premium"]);

export function badgesFor(input: {
  role?: string | null;
  plan?: string | null;
  achievements?: readonly string[];
}): Badge[] {
  const out: Badge[] = [];
  if (input.role === "admin") out.push({ key: "admin", label: "Admin", tone: "admin" });
  else if (input.role === "staff") out.push({ key: "staff", label: "Moderador", tone: "staff" });
  if (input.plan === "premium") out.push({ key: "premium", label: "Premium", tone: "premium" });
  for (const k of input.achievements ?? []) {
    const def = ACHIEVEMENT_BADGES[k];
    if (def) out.push({ key: k, label: def.label, tone: def.tone });
  }
  return out;
}

/** Compact set shown next to chat authors (status only). */
export function chatBadges(input: { role?: string | null; plan?: string | null }): Badge[] {
  return badgesFor(input).filter((b) => STATUS_TONES.has(b.tone));
}
