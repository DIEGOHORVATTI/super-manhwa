"use client";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { fetchFavourites, toggleFavourite, useAniList } from "@/lib/anilist";
import { planFavouritesSync } from "@/lib/anilist-sync";
import { addFavorite, useFavorites } from "@/lib/library";

/**
 * Optional "Sync with AniList" bar on the Biblioteca page. Hidden entirely when
 * the integration isn't configured. Login is implicit-grant (redirect); the
 * sync is a two-way merge: pull remote favourites into the local library and
 * push local-only ones to AniList (see planFavouritesSync — toggle-safe).
 */
export function AniListSync() {
  const { configured, isLoggedIn, session, login, logout } = useAniList();
  const favorites = useFavorites();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!configured) return null;

  const sync = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const remote = await fetchFavourites();
      const plan = planFavouritesSync(favorites, remote);
      for (const id of plan.toAddLocally) {
        const e = remote.find((r) => r.id === id);
        if (e) addFavorite(e);
      }
      for (const id of plan.toAddRemote) await toggleFavourite(id);
      setMsg(
        `Sincronizado: ${plan.toAddLocally.length} importado(s), ${plan.toAddRemote.length} enviado(s).`,
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao sincronizar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="anilist-bar">
      {isLoggedIn ? (
        <>
          <span className="anilist-status">
            <Icon name="circle-check-big" size={15} /> AniList
            {session?.name ? ` · ${session.name}` : ""}
          </span>
          <button type="button" className="pager-btn" disabled={busy} onClick={sync}>
            <Icon name="sparkles" size={15} /> {busy ? "Sincronizando…" : "Sincronizar favoritos"}
          </button>
          <button type="button" className="anilist-link" onClick={logout}>
            Sair
          </button>
        </>
      ) : (
        <>
          <span className="anilist-status muted">
            Sincronize seus favoritos com sua conta AniList
          </span>
          <button type="button" className="pager-btn" onClick={login}>
            <Icon name="heart" size={15} /> Entrar com AniList
          </button>
        </>
      )}
      {msg && <span className="anilist-msg muted">{msg}</span>}
    </div>
  );
}
