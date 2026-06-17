import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AnilistPanel } from "@/components/profile/AnilistPanel";
import { ProfileComments } from "@/components/profile/ProfileComments";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { ReadingHeatmap } from "@/components/profile/ReadingHeatmap";
import { EditProfileButton } from "@/components/EditProfileButton";
import { EditableAvatar, EditableBanner } from "@/components/profile/EditableProfileImages";
import { getCurrentUser } from "@/lib/auth/session";
import { badgesFor } from "@/lib/badges";
import { loadProfileData } from "@/lib/profile-data";
import { publicUrlFor, r2Enabled } from "@/lib/r2";
import { routes } from "@/lib/routes";

type Params = Promise<{ handle: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${handle}` };
}

const memberSince = (d: Date) =>
  new Date(d).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

export default async function ProfilePage({ params }: { params: Params }) {
  const { handle } = await params;
  const data = await loadProfileData(handle);
  if (!data) notFound();

  const {
    user,
    works,
    achievements,
    reading,
    wordsLearned,
    anilist,
    reputation,
    commentsCount,
    recentComments,
  } = data;

  // Canonical URL: if reached by id but a @handle exists, redirect to the pretty one.
  if (user.handle && handle !== user.handle) redirect(routes.user(user.handle));

  // Own-profile actions (create works, edit info) live here now | the Studio left
  // the footer and belongs on the author's own page.
  const me = await getCurrentUser();
  const isOwn = me?.id === user.id;

  const badges = badgesFor({
    role: user.role,
    plan: user.plan,
    achievements,
    reputation,
    commentsCount,
    createdAt: user.createdAt,
  });
  const al = anilist.profile;
  const bannerUrl =
    user.bannerR2Key && r2Enabled ? publicUrlFor(user.bannerR2Key) : (al?.banner ?? null);
  const avatarUrl = user.image ?? al?.avatar ?? null;
  const initial = (user.name ?? "?").charAt(0).toUpperCase();

  return (
    <div className="profile-wrap">
      <header className="profile-header">
        <EditableBanner bannerUrl={bannerUrl} editable={isOwn} />
        <div className="profile-id">
          <EditableAvatar avatarUrl={avatarUrl} initial={initial} editable={isOwn} />
          <div className="profile-info">
            <h1 className="profile-name">{user.name}</h1>
            <p className="profile-handle">
              {user.handle ? `@${user.handle}` : "sem @ definido"} · membro desde{" "}
              {memberSince(user.createdAt)}
            </p>
            {badges.length > 0 && (
              <div className="profile-badges">
                {badges.map((b) => (
                  <span
                    key={b.key}
                    className={`badge badge-${b.tone}${b.description ? " has-tip" : ""}`}
                  >
                    {b.label}
                    {b.description && (
                      <span className="badge-tip" role="tooltip">
                        {b.description}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {user.bio && <p className="profile-bio">{user.bio}</p>}
      </header>

      {isOwn && (
        <div className="profile-actions">
          <Link href={routes.studio} className="btn btn-primary">
            Gerenciar obras
          </Link>
          <EditProfileButton />
        </div>
      )}

      <ProfileStats
        stats={[
          { label: "reputação", value: reputation, icon: "⭐" },
          { label: "comentários", value: commentsCount, icon: "💬" },
          { label: "capítulos lidos", value: reading.chapters, icon: "📖" },
          { label: "obras lidas", value: reading.works, icon: "📚" },
          { label: "XP", value: user.xp, icon: "✨" },
          { label: "dias de streak", value: user.streakDays, icon: "🔥" },
          { label: "palavras", value: wordsLearned, icon: "🧠" },
          { label: "obras publicadas", value: works.length, icon: "🎨" },
        ]}
      />

      <ReadingHeatmap events={reading.events} />

      <AnilistPanel username={anilist.username} profile={al} />

      <ProfileComments comments={recentComments} />

      <section className="profile-section">
        <h2 className="section">Obras publicadas</h2>
        {works.length === 0 ? (
          <p className="muted">Nenhuma obra publicada ainda.</p>
        ) : (
          <div className="profile-works">
            {works.map((w) => (
              <Link key={w.id} href={routes.obra(w.slug)} className="profile-work">
                {w.title}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
