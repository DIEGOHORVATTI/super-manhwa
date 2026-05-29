"use client";
import { useState } from "react";
import { AniListLogo } from "@/components/AniListLogo";
import { Icon } from "@/components/Icon";
import { fetchFavourites, toggleFavourite, useAniList } from "@/lib/anilist";
import { planFavouritesSync } from "@/lib/anilist-sync";
import { addFavorite, useFavorites } from "@/lib/library";

/**
 * Optional "Connect AniList" card on the library page. Hidden when the
 * integration isn't configured. Styled like a third-party sign-in (branded
 * button + provider mark). Login is the OAuth code grant (server-exchanged); the
 * sync is a toggle-safe two-way merge of favourites (see planFavouritesSync).
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
      setMsg(`${plan.toAddLocally.length} importado(s) · ${plan.toAddRemote.length} enviado(s).`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao sincronizar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="anilist-card">
      <div className="anilist-card-info">
        <p className="anilist-title">
          <AniListLogo size={18} />
          {isLoggedIn
            ? `Conectado ao AniList${session?.name ? ` · ${session.name}` : ""}`
            : "Sincronize com o AniList"}
        </p>
        <p className="anilist-sub muted">
          {isLoggedIn
            ? (msg ?? "Seus favoritos ficam salvos na sua conta AniList.")
            : "Entre para salvar e acessar seus favoritos na sua conta AniList."}
        </p>
      </div>

      {isLoggedIn ? (
        <div className="anilist-actions">
          <button type="button" className="anilist-login" disabled={busy} onClick={sync}>
            <Icon name="sparkles" size={16} />
            {busy ? "Sincronizando…" : "Sincronizar favoritos"}
          </button>
          <button type="button" className="anilist-link" onClick={logout}>
            Sair
          </button>
        </div>
      ) : (
        <button type="button" className="anilist-login" onClick={login}>
          <AniListLogo size={20} />
          Entrar com AniList
        </button>
      )}
    </div>
  );
}
