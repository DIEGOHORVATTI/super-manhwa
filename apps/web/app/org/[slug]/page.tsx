import { and, asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Cover } from "@/components/Cover";
import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { publicUrlFor, r2Enabled } from "@/lib/r2";
import { routes } from "@/lib/routes";

type Params = Promise<{ slug: string }>;

/** Public org page: identity + members + published works. A private org is
 *  visible only to its members; to everyone else it 404s. */
async function loadOrg(slug: string) {
  if (!dbEnabled) return null;
  const db = getDb();
  const { teams, teamMembers, userWorks, user } = schema;

  const [org] = await db.select().from(teams).where(eq(teams.slug, slug)).limit(1);
  if (!org) return null;

  const members = await db
    .select({
      userId: teamMembers.userId,
      role: teamMembers.role,
      name: user.name,
      handle: user.handle,
    })
    .from(teamMembers)
    .leftJoin(user, eq(teamMembers.userId, user.id))
    .where(eq(teamMembers.teamId, org.id));

  if (!org.isPublic) {
    const session = await getServerSession();
    const callerId = session?.user?.id ?? null;
    if (!callerId || !members.some((m) => m.userId === callerId)) return null;
  }

  const works = await db
    .select({
      id: userWorks.id,
      title: userWorks.title,
      slug: userWorks.slug,
      coverR2Key: userWorks.coverR2Key,
    })
    .from(userWorks)
    .where(and(eq(userWorks.teamId, org.id), eq(userWorks.status, "published")))
    .orderBy(asc(userWorks.title));

  return { org, members, works };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadOrg(slug);
  return { title: data?.org.name ?? "Organização" };
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Dono",
  editor: "Editor",
  translator: "Tradutor",
  reviewer: "Revisor",
};

export default async function OrgPublicPage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await loadOrg(slug);
  if (!data) notFound();
  const { org, members, works } = data;

  const bannerUrl = org.bannerR2Key && r2Enabled ? publicUrlFor(org.bannerR2Key) : null;
  const avatarUrl = org.avatarR2Key && r2Enabled ? publicUrlFor(org.avatarR2Key) : null;

  return (
    <div className="profile-wrap">
      <header className="profile-header">
        <div
          className="profile-banner"
          style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
        />
        <div className="profile-id">
          <span className="profile-avatar org-page-avatar">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" />
            ) : (
              org.name.charAt(0).toUpperCase()
            )}
          </span>
          <div className="profile-info">
            <h1 className="profile-name">{org.name}</h1>
            <p className="profile-handle">/org/{org.slug}</p>
          </div>
        </div>
        {org.bio && <p className="profile-bio">{org.bio}</p>}
      </header>

      <section className="profile-section">
        <h2 className="section">Equipe</h2>
        <div className="org-team">
          {members.map((m) => (
            <span key={m.userId} className="org-team-chip">
              {m.handle ? (
                <Link href={routes.user(m.handle)}>{m.name ?? `@${m.handle}`}</Link>
              ) : (
                (m.name ?? "membro")
              )}
              <small className="muted"> · {ROLE_LABEL[m.role] ?? m.role}</small>
            </span>
          ))}
        </div>
      </section>

      <section className="profile-section">
        <h2 className="section">Obras</h2>
        {works.length === 0 ? (
          <p className="muted">Nenhuma obra publicada ainda.</p>
        ) : (
          <div className="poster-grid">
            {works.map((w) => (
              <Link key={w.id} href={routes.obra(w.slug)} className="poster">
                <div className="poster-cover">
                  <Cover
                    src={w.coverR2Key && r2Enabled ? publicUrlFor(w.coverR2Key) : undefined}
                    alt={w.title}
                    sizes="160px"
                  />
                </div>
                <span className="poster-name">{w.title}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
