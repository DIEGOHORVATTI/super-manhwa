import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";

import { OrgsMine } from "@/components/org/OrgsMine";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { publicUrlFor, r2Enabled } from "@/lib/r2";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Organizações" };

/** Public directory: organizations that opted in (public + named). */
async function loadDirectory() {
  if (!dbEnabled) return [];
  const db = getDb();
  const { teams } = schema;
  return db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      bio: teams.bio,
      avatarR2Key: teams.avatarR2Key,
    })
    .from(teams)
    .where(and(eq(teams.isPublic, true), isNotNull(teams.slug)))
    .orderBy(desc(teams.createdAt))
    .limit(60);
}

export default async function OrgsPage() {
  const orgs = await loadDirectory();

  return (
    <div className="orgs-wrap">
      <h1 className="settings-title">Organizações</h1>
      <p className="muted">
        Scans, estúdios e grupos de tradução. Crie a sua, monte o time e publique obras juntos.
      </p>

      <OrgsMine />

      <h2 className="section">Diretório</h2>
      {orgs.length === 0 ? (
        <p className="muted">Nenhuma organização pública ainda.</p>
      ) : (
        <div className="org-grid">
          {orgs.map((o) => (
            <Link key={o.id} href={routes.org(o.slug!)} className="org-card">
              <span className="org-avatar">
                {o.avatarR2Key && r2Enabled ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={publicUrlFor(o.avatarR2Key)} alt="" />
                ) : (
                  o.name.charAt(0).toUpperCase()
                )}
              </span>
              <strong>{o.name}</strong>
              {o.bio && <span className="muted org-card-bio">{o.bio}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
