import "server-only";
import { eq, inArray } from "drizzle-orm";

import { applyCatalog, badgesFor, type Badge, type TagOverride } from "@/lib/badges";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { listEmojisPublic } from "@/lib/emoji-manifest";

export interface CatalogTag {
  key: string;
  label: string;
  emote: string | null;
  color: string | null;
  description: string | null;
  assignable: boolean;
  sortOrder: number;
}

/** name → image URL for every custom emote (best-effort; empty without R2). */
async function emoteUrls(): Promise<Map<string, string>> {
  const list = await listEmojisPublic().catch(() => []);
  return new Map(list.map((e) => [e.name, e.url]));
}

/** Fill in `emoteUrl` for badges that reference an emote by name. */
function withEmoteUrls(badges: Badge[], urls: Map<string, string>): Badge[] {
  return badges.map((b) => (b.emote ? { ...b, emoteUrl: urls.get(b.emote) ?? b.emoteUrl } : b));
}

/**
 * Seed values | the badge display that used to be hardcoded in `badges.ts`, now
 * editable. `assignable: false` = granted by a code rule (role/plan/achievement),
 * so it's not in the admin "hand out a tag" list but its look is still editable.
 * The tiered rank badges (rep, keyboard-warrior) keep their dynamic labels in code.
 */
const DEFAULT_TAGS: CatalogTag[] = [
  {
    key: "admin",
    label: "Admin",
    emote: null,
    color: "#f87171",
    description: "Administra o site",
    assignable: false,
    sortOrder: 0,
  },
  {
    key: "staff",
    label: "Moderador",
    emote: null,
    color: "#60a5fa",
    description: "Modera a comunidade",
    assignable: false,
    sortOrder: 1,
  },
  {
    key: "premium",
    label: "Premium",
    emote: null,
    color: "#ff3e6e",
    description: "Assinante Premium",
    assignable: false,
    sortOrder: 2,
  },
  {
    key: "early-adopter",
    label: "Pioneiro",
    emote: null,
    color: "#fbbf24",
    description: "Entrou no comecinho do projeto",
    assignable: false,
    sortOrder: 3,
  },
  {
    key: "words_100",
    label: "100 palavras",
    emote: null,
    color: "#4ade80",
    description: "Aprendeu 100 palavras",
    assignable: false,
    sortOrder: 10,
  },
  {
    key: "words_1000",
    label: "1.000 palavras",
    emote: null,
    color: "#4ade80",
    description: "Aprendeu 1.000 palavras",
    assignable: false,
    sortOrder: 11,
  },
  {
    key: "streak_7",
    label: "7 dias seguidos",
    emote: null,
    color: "#4ade80",
    description: "Estudou 7 dias seguidos",
    assignable: false,
    sortOrder: 12,
  },
  {
    key: "streak_30",
    label: "30 dias seguidos",
    emote: null,
    color: "#4ade80",
    description: "Estudou 30 dias seguidos",
    assignable: false,
    sortOrder: 13,
  },
  {
    key: "first_chapter",
    label: "Primeiro capítulo",
    emote: null,
    color: "#4ade80",
    description: "Leu o primeiro capítulo",
    assignable: false,
    sortOrder: 14,
  },
  {
    key: "read_10_works",
    label: "10 obras lidas",
    emote: null,
    color: "#2dd4bf",
    description: "Leu 10 obras diferentes",
    assignable: false,
    sortOrder: 20,
  },
  {
    key: "read_50_works",
    label: "50 obras lidas",
    emote: null,
    color: "#2dd4bf",
    description: "Leu 50 obras diferentes",
    assignable: false,
    sortOrder: 21,
  },
  {
    key: "read_100_chapters",
    label: "100 capítulos",
    emote: null,
    color: "#2dd4bf",
    description: "Leu 100 capítulos",
    assignable: false,
    sortOrder: 22,
  },
  {
    key: "read_500_chapters",
    label: "500 capítulos",
    emote: null,
    color: "#2dd4bf",
    description: "Leu 500 capítulos",
    assignable: false,
    sortOrder: 23,
  },
];

/** Load the catalog, seeding defaults on first run (idempotent). */
export async function loadTagCatalog(): Promise<CatalogTag[]> {
  if (!dbEnabled) return DEFAULT_TAGS;
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.tags)
    .orderBy(schema.tags.sortOrder, schema.tags.label);
  if (rows.length === 0) {
    await db.insert(schema.tags).values(DEFAULT_TAGS).onConflictDoNothing();
    return DEFAULT_TAGS;
  }
  return rows as CatalogTag[];
}

function catalogMap(catalog: CatalogTag[]): Map<string, TagOverride> {
  return new Map(catalog.map((t) => [t.key, t]));
}

/** Manual tags (as badges) for a set of users, keyed by userId. */
export async function manualBadgesForUsers(userIds: string[]): Promise<Map<string, Badge[]>> {
  const out = new Map<string, Badge[]>();
  if (!dbEnabled || userIds.length === 0) return out;
  const db = getDb();
  const { userTags, tags } = schema;
  const [rows, urls] = await Promise.all([
    db
      .select({
        userId: userTags.userId,
        key: tags.key,
        label: tags.label,
        emote: tags.emote,
        color: tags.color,
        description: tags.description,
      })
      .from(userTags)
      .innerJoin(tags, eq(userTags.tagKey, tags.key))
      .where(inArray(userTags.userId, userIds)),
    emoteUrls(),
  ]);
  for (const r of rows) {
    const badge: Badge = {
      key: r.key,
      label: r.label,
      tone: "special",
      emote: r.emote ?? undefined,
      emoteUrl: r.emote ? urls.get(r.emote) : undefined,
      color: r.color ?? undefined,
      description: r.description ?? undefined,
    };
    const list = out.get(r.userId);
    if (list) list.push(badge);
    else out.set(r.userId, [badge]);
  }
  return out;
}

/** Full profile badge set: catalog-overlaid auto badges + manual tags. */
export async function resolveProfileBadges(
  signals: Parameters<typeof badgesFor>[0],
  userId: string,
): Promise<Badge[]> {
  const [catalog, manualByUser, urls] = await Promise.all([
    loadTagCatalog(),
    manualBadgesForUsers([userId]),
    emoteUrls(),
  ]);
  const map = catalogMap(catalog);
  const auto = withEmoteUrls(applyCatalog(badgesFor(signals), map), urls);
  const manual = applyCatalog(manualByUser.get(userId) ?? [], map);
  return [...auto, ...manual];
}
