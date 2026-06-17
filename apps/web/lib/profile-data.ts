import "server-only";
import { and, count, countDistinct, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";

import { anilistProfile, type AnilistProfile } from "@/lib/anilist-profile";
import { dbEnabled, getDb, schema } from "@/lib/db";

export interface ProfileData {
  user: {
    id: string;
    name: string;
    handle: string | null;
    bio: string | null;
    image: string | null;
    bannerR2Key: string | null;
    role: string;
    plan: string;
    xp: number;
    streakDays: number;
    createdAt: Date;
  };
  works: Array<{ id: number; title: string; slug: string; coverR2Key: string | null }>;
  achievements: string[];
  reading: { chapters: number; works: number; events: Array<{ readAt: Date }> };
  wordsLearned: number;
  commentsCount: number;
  reputation: number;
  recentComments: Array<{
    id: number;
    body: string;
    score: number;
    createdAt: Date;
    workId: string | null;
    workTitle: string | null;
  }>;
  anilist: { username: string | null; profile: AnilistProfile | null };
}

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** Load the full public profile bundle for `handle` (resolved by @handle or id). */
export async function loadProfileData(handle: string): Promise<ProfileData | null> {
  if (!dbEnabled) return null;
  const db = getDb();
  const {
    user,
    userWorks,
    userAchievements,
    readingEvents,
    userWords,
    comments,
    account,
    cachedWorks,
    cachedChapters,
  } = schema;

  const [u] = await db
    .select({
      id: user.id,
      name: user.name,
      handle: user.handle,
      bio: user.bio,
      image: user.image,
      bannerR2Key: user.bannerR2Key,
      role: user.role,
      plan: user.plan,
      xp: user.xp,
      streakDays: user.streakDays,
      createdAt: user.createdAt,
    })
    .from(user)
    // Resolve by @handle or, for users who haven't set one yet, by id.
    .where(or(eq(user.handle, handle), eq(user.id, handle)))
    .limit(1);
  if (!u) return null;

  const since = new Date(Date.now() - YEAR_MS);
  const [works, ach, [readTotals], readEvents, [wl], [cc], links, [rep], recent] =
    await Promise.all([
      db
        .select({
          id: userWorks.id,
          title: userWorks.title,
          slug: userWorks.slug,
          coverR2Key: userWorks.coverR2Key,
        })
        .from(userWorks)
        .where(and(eq(userWorks.ownerId, u.id), eq(userWorks.status, "published")))
        .orderBy(desc(userWorks.createdAt))
        .limit(24),
      db
        .select({ key: userAchievements.achievementKey })
        .from(userAchievements)
        .where(eq(userAchievements.userId, u.id)),
      db
        .select({ chapters: count(), works: countDistinct(readingEvents.workId) })
        .from(readingEvents)
        .where(eq(readingEvents.userId, u.id)),
      db
        .select({ readAt: readingEvents.readAt })
        .from(readingEvents)
        .where(and(eq(readingEvents.userId, u.id), gte(readingEvents.readAt, since)))
        .limit(5000),
      db
        .select({ n: count() })
        .from(userWords)
        .where(and(eq(userWords.userId, u.id), inArray(userWords.status, ["learning", "known"]))),
      db
        .select({ n: count() })
        .from(comments)
        .where(and(eq(comments.userId, u.id), isNull(comments.deletedAt))),
      db
        .select({ accountId: account.accountId, scope: account.scope, token: account.accessToken })
        .from(account)
        .where(and(eq(account.userId, u.id), eq(account.providerId, "anilist")))
        .limit(1),
      db
        .select({ n: sql<number>`coalesce(sum(${comments.score}), 0)` })
        .from(comments)
        .where(and(eq(comments.userId, u.id), isNull(comments.deletedAt))),
      db
        .select({
          id: comments.id,
          body: comments.body,
          score: comments.score,
          targetType: comments.targetType,
          targetId: comments.targetId,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .where(and(eq(comments.userId, u.id), isNull(comments.deletedAt)))
        .orderBy(desc(comments.createdAt))
        .limit(8),
    ]);

  // Resolve each comment's work title for display. Work comments key on the work
  // catalogId directly; chapter comments resolve their work via cachedChapters.
  const workTargets = recent.filter((c) => c.targetType === "work").map((c) => c.targetId);
  const chapterTargets = recent.filter((c) => c.targetType === "chapter").map((c) => c.targetId);
  const chRows = chapterTargets.length
    ? await db
        .select({ chapterKey: cachedChapters.chapterKey, catalogId: cachedChapters.catalogId })
        .from(cachedChapters)
        .where(inArray(cachedChapters.chapterKey, chapterTargets))
    : [];
  const chapterToCatalog = new Map(chRows.map((r) => [r.chapterKey, r.catalogId]));
  const catalogIds = [...workTargets, ...chRows.map((r) => r.catalogId)];
  const titleRows = catalogIds.length
    ? await db
        .select({ catalogId: cachedWorks.catalogId, title: cachedWorks.title })
        .from(cachedWorks)
        .where(inArray(cachedWorks.catalogId, catalogIds))
    : [];
  const titleMap = new Map(titleRows.map((r) => [r.catalogId, r.title]));

  const recentComments = recent.map((c) => {
    const workId =
      c.targetType === "work" ? c.targetId : (chapterToCatalog.get(c.targetId) ?? null);
    return {
      id: c.id,
      body: c.body ?? "",
      score: c.score,
      createdAt: c.createdAt,
      workId,
      workTitle: workId ? (titleMap.get(workId) ?? null) : null,
    };
  });

  const link = links[0];
  const profile =
    link?.token != null ? await anilistProfile(link.accountId, link.token).catch(() => null) : null;

  // Persist the AniList avatar into user.image once, so it shows everywhere the
  // account is rendered (donations wall, comments, header) without a live fetch.
  if (!u.image && profile?.avatar) {
    u.image = profile.avatar;
    await db
      .update(user)
      .set({ image: profile.avatar })
      .where(eq(user.id, u.id))
      .catch(() => {});
  }

  return {
    user: u,
    works,
    achievements: ach.map((a) => a.key),
    reading: {
      chapters: Number(readTotals?.chapters ?? 0),
      works: Number(readTotals?.works ?? 0),
      events: readEvents,
    },
    wordsLearned: Number(wl?.n ?? 0),
    commentsCount: Number(cc?.n ?? 0),
    reputation: Number(rep?.n ?? 0),
    recentComments,
    anilist: { username: link?.scope ?? null, profile },
  };
}
