import type { MangaCharacter } from "@packages/contracts";

const ROLE_LABEL: Record<string, string> = {
  MAIN: "Principal",
  SUPPORTING: "Coadjuvante",
  BACKGROUND: "Secundário",
};

/** Character cards (AniList metadata) — image + name + localized role. */
export function CharacterGrid({ characters }: { characters: MangaCharacter[] }) {
  if (characters.length === 0) {
    return <p className="muted">Sem informações de personagens para esta obra.</p>;
  }
  return (
    <div className="char-grid">
      {characters.map((c) => (
        <div key={c.name} className="char-card">
          <div className="char-cover">
            {c.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img loading="lazy" src={c.imageUrl} alt={c.name} />
            ) : (
              <div className="poster-noimg">sem foto</div>
            )}
          </div>
          <div className="char-name">{c.name}</div>
          {c.role && <div className="char-role">{ROLE_LABEL[c.role] ?? c.role}</div>}
        </div>
      ))}
    </div>
  );
}
