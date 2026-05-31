"use client";
import { Icon } from "@/components/Icon";
import { toggleFavourite, useAniList } from "@/lib/anilist";
import { toggleFavorite, useIsFavorite } from "@/lib/library";

/**
 * Star/unstar a work into the local library. Login-free (localStorage), so it's
 * a client island on the otherwise server-rendered detail page. Renders a
 * stable label on the server (not favorited) and reconciles after hydration.
 */
export function FavoriteButton({
  id,
  name,
  imageUrl,
  compact = false,
}: {
  id: string;
  name: string;
  imageUrl?: string;
  /** Icon-only pill for poster overlays (listing cards), no text label. */
  compact?: boolean;
}) {
  const fav = useIsFavorite(id);
  const { isLoggedIn } = useAniList();

  const onToggle = (e: React.MouseEvent) => {
    // On listing cards the button sits over a poster <Link>; don't navigate.
    if (compact) {
      e.preventDefault();
      e.stopPropagation();
    }
    toggleFavorite({ id, name, imageUrl });
    // Best-effort mirror to AniList when connected (the local store is the source
    // of truth for the UI; a failure here never blocks the toggle).
    if (isLoggedIn) toggleFavourite(id).catch(() => {});
  };

  const label = fav ? "Remover da biblioteca" : "Adicionar à biblioteca";
  return (
    <button
      type="button"
      className={`fav-btn${compact ? " fav-btn-compact" : ""}${fav ? " is-active" : ""}`}
      aria-pressed={fav}
      aria-label={compact ? label : undefined}
      title={label}
      onClick={onToggle}
    >
      <Icon name="heart" size={16} />
      {!compact && <span>{fav ? "Na biblioteca" : "Adicionar"}</span>}
    </button>
  );
}
