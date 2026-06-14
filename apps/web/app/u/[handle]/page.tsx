import { and, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { badgesFor } from "@/lib/badges";
import { dbEnabled, getDb, schema } from "@/lib/db";

type Params = Promise<{ handle: string }>;

async function loadProfile(handle: string) {
  if (!dbEnabled) return null;
  const db = getDb();
  const { user, userWorks, userAchievements } = schema;
  const [u] = await db
    .select({
      id: user.id,
      name: user.name,
      handle: user.handle,
      bio: user.bio,
      image: user.image,
      role: user.role,
      plan: user.plan,
      xp: user.xp,
      streakDays: user.streakDays,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.handle, handle))
    .limit(1);
  if (!u) return null;

  const works = await db
    .select({
      id: userWorks.id,
      title: userWorks.title,
      slug: userWorks.slug,
      coverR2Key: userWorks.coverR2Key,
    })
    .from(userWorks)
    .where(and(eq(userWorks.ownerId, u.id), eq(userWorks.status, "published")))
    .orderBy(desc(userWorks.createdAt))
    .limit(24);

  const ach = await db
    .select({ key: userAchievements.achievementKey })
    .from(userAchievements)
    .where(eq(userAchievements.userId, u.id));

  return { user: u, works, achievements: ach.map((a) => a.key) };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${handle}` };
}

export default async function ProfilePage({ params }: { params: Params }) {
  const { handle } = await params;
  const data = await loadProfile(handle);
  if (!data) notFound();
  const { user, works, achievements } = data;
  const initial = (user.name ?? "?").charAt(0).toUpperCase();
  const badges = badgesFor({ role: user.role, plan: user.plan, achievements });

  return (
    <div className="profile-wrap">
      <header className="profile-head">
        <div className="profile-avatar">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{user.name}</h1>
          <p className="profile-handle">@{user.handle}</p>
          {badges.length > 0 && (
            <div className="profile-badges">
              {badges.map((b) => (
                <span key={b.key} className={`badge badge-${b.tone}`}>
                  {b.label}
                </span>
              ))}
            </div>
          )}
          {user.bio && <p className="profile-bio">{user.bio}</p>}
        </div>
      </header>

      <h2 className="section">Obras publicadas</h2>
      {works.length === 0 ? (
        <p className="muted">Nenhuma obra publicada ainda.</p>
      ) : (
        <div className="profile-works">
          {works.map((w) => (
            <Link key={w.id} href={`/obra/${w.slug}`} className="profile-work">
              {w.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
