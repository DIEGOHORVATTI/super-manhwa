"use client";
import type { MangaCharacter } from "@packages/contracts";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { MarkdownDescription } from "@/components/MarkdownDescription";

const ROLE_LABEL: Record<string, string> = {
  MAIN: "Principal",
  SUPPORTING: "Coadjuvante",
  BACKGROUND: "Secundário",
};

const GENDER_LABEL: Record<string, string> = {
  Male: "Masculino",
  Female: "Feminino",
  "Non-binary": "Não-binário",
};

/** AniList bios use ~!spoiler!~ markers — drop them, keep the text readable. */
const cleanBio = (text?: string) => text?.replace(/~!|!~/g, "").trim() || undefined;

/**
 * Character cards (AniList metadata). Clicking a card opens a modal with the
 * full bio, native name and stats. Modal closes on Esc / backdrop / ✕.
 */
export function CharacterGrid({ characters }: { characters: MangaCharacter[] }) {
  const [selected, setSelected] = useState<MangaCharacter | null>(null);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    document.addEventListener("keydown", onKey);
    // Lock background scroll while the modal is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [selected]);

  if (characters.length === 0) {
    return <p className="muted">Sem informações de personagens para esta obra.</p>;
  }

  const bio = cleanBio(selected?.description);

  return (
    <>
      <div className="char-grid">
        {characters.map((c) => (
          <button
            type="button"
            key={c.name}
            className="char-card"
            onClick={() => setSelected(c)}
            aria-label={`Ver detalhes de ${c.name}`}
          >
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
          </button>
        ))}
      </div>

      {selected && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={selected.name}
          onClick={() => setSelected(null)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setSelected(null)}
              aria-label="Fechar"
            >
              <Icon name="x" size={16} />
            </button>

            <div className="char-modal-head">
              <div className="char-modal-cover">
                {selected.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.imageUrl} alt={selected.name} />
                ) : (
                  <div className="poster-noimg">sem foto</div>
                )}
              </div>
              <div className="char-modal-info">
                <h2 className="char-modal-name">{selected.name}</h2>
                {selected.nativeName && <p className="char-modal-native">{selected.nativeName}</p>}
                <div className="char-modal-facts">
                  {selected.role && (
                    <span className="tag">{ROLE_LABEL[selected.role] ?? selected.role}</span>
                  )}
                  {selected.gender && (
                    <span className="tag">{GENDER_LABEL[selected.gender] ?? selected.gender}</span>
                  )}
                  {selected.age && <span className="tag">{selected.age} anos</span>}
                  {selected.favourites !== undefined && (
                    <span className="tag tag-icon">
                      <Icon name="heart" size={12} />
                      {selected.favourites.toLocaleString("pt-BR")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {bio ? (
              <div className="char-modal-bio">
                <MarkdownDescription text={bio} />
              </div>
            ) : (
              <p className="muted" style={{ marginTop: 12 }}>
                Sem biografia disponível.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
