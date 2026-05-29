"use client";
import { Icon } from "@/components/Icon";
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
  return (
    <button
      type="button"
      className={`fav-btn${fav ? " is-active" : ""}`}
      aria-pressed={fav}
      onClick={() => toggleFavorite({ id, name, imageUrl })}
    >
      <Icon name="heart" size={16} />
      <span>{fav ? "Na biblioteca" : "Adicionar"}</span>
    </button>
  );
}
