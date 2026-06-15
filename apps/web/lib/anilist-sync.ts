/**
 * Pure two-way merge for the AniList favourites sync | no window/network, so it
 * can be unit-tested. `ToggleFavourite` is a *toggle* (not idempotent add), so we
 * must only push locals that AniList doesn't already have, and only pull remotes
 * the local library is missing | otherwise a re-sync would flip things off.
 */
export type FavRef = { id: string };

export type SyncPlan = {
  /** Remote favourites missing locally → add to the local library. */
  toAddLocally: string[];
  /** Local favourites missing on AniList → ToggleFavourite (add) remotely. */
  toAddRemote: string[];
};

export function planFavouritesSync(local: FavRef[], remote: FavRef[]): SyncPlan {
  const localIds = new Set(local.map((x) => x.id));
  const remoteIds = new Set(remote.map((x) => x.id));
  return {
    toAddLocally: remote.filter((r) => !localIds.has(r.id)).map((r) => r.id),
    toAddRemote: local.filter((l) => !remoteIds.has(l.id)).map((l) => l.id),
  };
}
