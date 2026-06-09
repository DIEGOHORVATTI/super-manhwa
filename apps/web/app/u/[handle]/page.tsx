import { and, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { dbEnabled, getDb, schema } from "@/lib/db";

type Params = Promise<{ handle: string }>;

async function loadProfile(handle: string) {
  if (!dbEnabled) return null;
  const db = getDb();
  const { user, userWorks } = schema;
  const [u] = await db
    .select({
      id: user.id,
      name: user.name,
      handle: user.handle,
      bio: user.bio,
      image: user.image,
      role: user.role,
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
  return { user: u, works };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${handle}` };
}

export default async function ProfilePage({ params }: { params: Params }) {
  const { handle } = await params;
  const data = await loadProfile(handle);
  if (!data) notFound();
  const { user, works } = data;
  const initial = (user.name ?? "?").charAt(0).toUpperCase();

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
          <h1 className="profile-name">
            {user.name}
            {user.role !== "user" && <span className="profile-badge">{user.role}</span>}
          </h1>
          <p className="profile-handle">@{user.handle}</p>
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
