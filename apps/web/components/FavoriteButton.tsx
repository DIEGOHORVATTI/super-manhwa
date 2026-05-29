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
}: {
  id: string;
  name: string;
  imageUrl?: string;
}) {
  const fav = useIsFavorite(id);
  const { isLoggedIn } = useAniList();

  const onToggle = () => {
    toggleFavorite({ id, name, imageUrl });
    // Best-effort mirror to AniList when connected (the local store is the source
    // of truth for the UI; a failure here never blocks the toggle).
    if (isLoggedIn) toggleFavourite(id).catch(() => {});
  };

  return (
    <button
      type="button"
      className={`fav-btn${fav ? " is-active" : ""}`}
      aria-pressed={fav}
      onClick={onToggle}
    >
      <Icon name="heart" size={16} />
      <span>{fav ? "Na biblioteca" : "Adicionar"}</span>
    </button>
  );
}
