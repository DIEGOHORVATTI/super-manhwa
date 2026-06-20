/**
 * Badge catalog + resolver | pure, no DB/server-only, so it's usable in client
 * components (comment authors, profile) and unit-tested. A user's badges come
 * from their role, plan and unlocked achievement keys.
 *
 * `tone` drives the color and which surfaces show it: chat shows only the
 * "status" tones (admin/staff/premium); the profile shows everything.
 */
export type BadgeTone =
  | "admin"
  | "staff"
  | "premium"
  | "lang"
  | "reading"
  | "rep"
  | "activity"
  | "special";

export interface Badge {
  key: string;
  label: string;
  tone: BadgeTone;
  /** Optional rule explanation, shown as a tooltip on the profile. */
  description?: string;
  /** Optional custom emote name (`:name:`, from the editable catalog). */
  emote?: string;
  /** Emote image URL, resolved from `emote` at the server boundary. */
  emoteUrl?: string;
  /** Optional hex color (catalog override); falls back to the tone class. */
  color?: string;
}

/** Catalog row shape (subset) used to overlay editable display onto a badge. */
export interface TagOverride {
  key: string;
  label?: string | null;
  emote?: string | null;
  color?: string | null;
  description?: string | null;
}

/**
 * Overlay the editable catalog onto code-resolved badges, by key. Catalog values
 * win when present; missing fields keep the code default. Pure so it's unit-tested.
 */
export function applyCatalog(badges: Badge[], catalog: Map<string, TagOverride>): Badge[] {
  return badges.map((b) => {
    const c = catalog.get(b.key);
    if (!c) return b;
    return {
      ...b,
      label: c.label || b.label,
      emote: c.emote ?? b.emote,
      color: c.color ?? b.color,
      description: c.description ?? b.description,
    };
  });
}

/** Reputation ladder (sum of upvotes on the user's comments). Highest match wins. */
const REP_TIERS: ReadonlyArray<{ min: number; label: string }> = [
  { min: 2000, label: "Onisciente" },
  { min: 500, label: "Veterano" },
  { min: 100, label: "Conhecido" },
];
/** Comment-count ladder. Highest match wins. */
const COMMENT_TIERS: ReadonlyArray<{ min: number; label: string }> = [
  { min: 200, label: "Guerreiro do Teclado" },
  { min: 50, label: "Comentarista" },
];
/** Accounts created before this date earn the Early Adopter badge. */
const EARLY_ADOPTER_BEFORE = new Date("2027-01-01");

/** Achievement-key → badge label + tone + how it was earned (pt-BR). */
export const ACHIEVEMENT_BADGES: Record<
  string,
  { label: string; tone: BadgeTone; description: string }
> = {
  // Language learning
  words_100: { label: "100 palavras", tone: "lang", description: "Aprendeu 100 palavras" },
  words_1000: { label: "1.000 palavras", tone: "lang", description: "Aprendeu 1.000 palavras" },
  streak_7: { label: "7 dias seguidos", tone: "lang", description: "Estudou 7 dias seguidos" },
  streak_30: { label: "30 dias seguidos", tone: "lang", description: "Estudou 30 dias seguidos" },
  first_chapter: {
    label: "Primeiro capítulo",
    tone: "lang",
    description: "Leu o primeiro capítulo",
  },
  // Reading
  read_10_works: {
    label: "10 obras lidas",
    tone: "reading",
    description: "Leu 10 obras diferentes",
  },
  read_50_works: {
    label: "50 obras lidas",
    tone: "reading",
    description: "Leu 50 obras diferentes",
  },
  read_100_chapters: { label: "100 capítulos", tone: "reading", description: "Leu 100 capítulos" },
  read_500_chapters: { label: "500 capítulos", tone: "reading", description: "Leu 500 capítulos" },
};

const STATUS_TONES: ReadonlySet<BadgeTone> = new Set(["admin", "staff", "premium"]);

export function badgesFor(input: {
  role?: string | null;
  plan?: string | null;
  achievements?: readonly string[];
  reputation?: number;
  commentsCount?: number;
  createdAt?: Date | string | null;
}): Badge[] {
  const out: Badge[] = [];
  if (input.role === "admin")
    out.push({ key: "admin", label: "Admin", tone: "admin", description: "Administra o site" });
  else if (input.role === "staff")
    out.push({
      key: "staff",
      label: "Moderador",
      tone: "staff",
      description: "Modera a comunidade",
    });
  if (input.plan === "premium")
    out.push({
      key: "premium",
      label: "Premium",
      tone: "premium",
      description: "Assinante Premium",
    });

  const rep = input.reputation ?? 0;
  const repTier = REP_TIERS.find((t) => rep >= t.min);
  if (repTier) {
    out.push({
      key: "rep",
      label: repTier.label,
      tone: "rep",
      description: `Reputação ${rep} — votos positivos nos seus comentários`,
    });
  }

  const comments = input.commentsCount ?? 0;
  const cTier = COMMENT_TIERS.find((t) => comments >= t.min);
  if (cTier) {
    out.push({
      key: "keyboard-warrior",
      label: cTier.label,
      tone: "activity",
      description: `${comments} comentários publicados`,
    });
  }

  if (input.createdAt && new Date(input.createdAt) < EARLY_ADOPTER_BEFORE) {
    out.push({
      key: "early-adopter",
      label: "Pioneiro",
      tone: "special",
      description: "Entrou no comecinho do projeto",
    });
  }

  for (const k of input.achievements ?? []) {
    const def = ACHIEVEMENT_BADGES[k];
    if (def) out.push({ key: k, label: def.label, tone: def.tone, description: def.description });
  }
  return out;
}

/** Compact set shown next to chat authors (status only). */
export function chatBadges(input: { role?: string | null; plan?: string | null }): Badge[] {
  return badgesFor(input).filter((b) => STATUS_TONES.has(b.tone));
}
