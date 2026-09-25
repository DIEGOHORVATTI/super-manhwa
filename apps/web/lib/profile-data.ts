import "server-only";
import { and, count, countDistinct, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";

import { anilistProfile, type AnilistProfile } from "@/lib/anilist-profile";
import { resolveTargets } from "@/lib/catalog/targets";
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
    href: string;
    targetTitle: string | null;
  }>;
  anilist: { username: string | null; profile: AnilistProfile | null };
}

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** Load the full public profile bundle for `handle` (resolved by @handle or id). */
export async function loadProfileData(handle: string): Promise<ProfileData | null> {
  if (!dbEnabled) return null;
  const db = getDb();
  const { user, userWorks, userAchievements, readingEvents, userWords, comments, account } = schema;

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

  const targetOf = await resolveTargets(recent);
  const recentComments = recent.map((c) => ({
    id: c.id,
    body: c.body ?? "",
    score: c.score,
    createdAt: c.createdAt,
    href: targetOf(c).href,
    targetTitle: targetOf(c).title,
  }));

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
