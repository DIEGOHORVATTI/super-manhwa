import Link from "next/link";

import type { AnilistProfile } from "@/lib/anilist-profile";
import { routes } from "@/lib/routes";

/**
 * AniList panel — shows the linked account's manga stats + favourite covers.
 * Renders nothing when no AniList account is linked. Public (read-only).
 */
export function AnilistPanel({
  username,
  profile,
}: {
  username: string | null;
  profile: AnilistProfile | null;
}) {
  if (!username && !profile) return null;
  const name = profile?.name ?? username;

  return (
    <section className="profile-section">
      <div className="profile-section-head">
        <h2 className="section">AniList</h2>
        {name && (
          <a
            className="anilist-link"
            href={`https://anilist.co/user/${name}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            @{name}
          </a>
        )}
      </div>

      {profile && (
        <>
          <div className="anilist-stats">
            <div className="anilist-stat">
              <strong>{profile.mangaCount}</strong>
              <span>mangás na lista</span>
            </div>
            <div className="anilist-stat">
              <strong>{profile.chaptersRead}</strong>
              <span>capítulos lidos</span>
            </div>
            <div className="anilist-stat">
              <strong>{profile.favourites.length}</strong>
              <span>favoritos</span>
            </div>
          </div>

          {profile.favourites.length > 0 && (
            <div className="anilist-favs">
              {profile.favourites.map((f) => (
                <Link
                  key={f.id}
                  className="anilist-fav"
                  href={routes.manga(String(f.id), f.title)}
                  title={f.title}
                >
                  {f.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.cover} alt={f.title} loading="lazy" />
                  ) : (
                    <span>{f.title.charAt(0)}</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
