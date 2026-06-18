"use client";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Client-only, login-free persistence layer (localStorage). Three concerns,
 * deliberately small and versioned:
 *   - favorites  → the user's library (works they starred)
 *   - history    → "continue reading" (last chapter opened per work)
 *   - read       → which chapters are read (greyed in the chapter list)
 *
 * Reads go through `useSyncExternalStore`, so components stay in sync across
 * tabs (the `storage` event) and within a tab (a custom event we dispatch on
 * every write). `getServerSnapshot` returns the empty value, so SSR renders the
 * logged-out/empty state and the client fills it in after hydration | these are
 * always rendered inside client islands, never blocking a cached server page.
 */

export type LibEntry = { id: string; name: string; imageUrl?: string; addedAt: number };
export type ProgressEntry = {
  id: string;
  name: string;
  imageUrl?: string;
  chapterId: string;
  chapterName?: string;
  chapterNo?: number;
  updatedAt: number;
};

const K = {
  favorites: "mr:favorites:v1",
  history: "mr:history:v1",
  read: "mr:read:v1",
  downloaded: "mr:downloaded:v1",
} as const;

const HISTORY_CAP = 60;
const READ_CAP_PER_WORK = 2000;
const EVENT = "mr-store-change";
const isClient = typeof window !== "undefined";

function readRaw<T>(key: string, fallback: T): T {
  if (!isClient) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeRaw<T>(key: string, value: T): void {
  if (!isClient) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
  } catch {
    /* quota / private mode | degrade silently */
  }
}

function subscribe(cb: () => void): () => void {
  if (!isClient) return () => {};
  const onStorage = () => cb();
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, onStorage);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, onStorage);
  };
}

/**
 * Snapshot must be referentially stable between renders or React loops. We cache
 * the parsed value per key and only return a new reference when the raw string
 * actually changed.
 */
const cache = new Map<string, { raw: string | null; parsed: unknown }>();

function useStore<T>(key: string, fallback: T): T {
  const getSnapshot = useCallback((): T => {
    if (!isClient) return fallback;
    const raw = window.localStorage.getItem(key);
    const hit = cache.get(key);
    if (hit && hit.raw === raw) return hit.parsed as T;
    let parsed: T;
    try {
      parsed = raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      parsed = fallback;
    }
    cache.set(key, { raw, parsed });
    return parsed;
  }, [key, fallback]);

  return useSyncExternalStore(subscribe, getSnapshot, () => fallback);
}

const EMPTY_FAVS: LibEntry[] = [];
const EMPTY_HISTORY: ProgressEntry[] = [];
const EMPTY_READ: Record<string, string[]> = {};

/* ----------------------------------- favorites ---------------------------- */

export function useFavorites(): LibEntry[] {
  return useStore<LibEntry[]>(K.favorites, EMPTY_FAVS);
}

export function useIsFavorite(id: string): boolean {
  return useFavorites().some((f) => f.id === id);
}

export function toggleFavorite(entry: Omit<LibEntry, "addedAt">): void {
  const list = readRaw<LibEntry[]>(K.favorites, []);
  const exists = list.some((f) => f.id === entry.id);
  const next = exists
    ? list.filter((f) => f.id !== entry.id)
    : [{ ...entry, addedAt: Date.now() }, ...list];
  writeRaw(K.favorites, next);
}

/** Idempotent add (used by the AniList import | never removes). */
export function addFavorite(entry: Omit<LibEntry, "addedAt">): void {
  const list = readRaw<LibEntry[]>(K.favorites, []);
  if (list.some((f) => f.id === entry.id)) return;
  writeRaw(K.favorites, [{ ...entry, addedAt: Date.now() }, ...list]);
}

/** Union server favorites into the local store (login sync, newest-first). */
export function mergeFavorites(entries: LibEntry[]): void {
  if (entries.length === 0) return;
  const byId = new Map(readRaw<LibEntry[]>(K.favorites, []).map((f) => [f.id, f]));
  for (const e of entries) if (!byId.has(e.id)) byId.set(e.id, e);
  writeRaw(
    K.favorites,
    [...byId.values()].sort((a, b) => b.addedAt - a.addedAt),
  );
}

/* ------------------------------- continue reading ------------------------- */

export function useHistory(): ProgressEntry[] {
  return useStore<ProgressEntry[]>(K.history, EMPTY_HISTORY);
}

/** Record (or move to front) the last chapter opened for a work. */
export function recordProgress(entry: Omit<ProgressEntry, "updatedAt">): void {
  const list = readRaw<ProgressEntry[]>(K.history, []);
  const rest = list.filter((e) => e.id !== entry.id);
  const next = [{ ...entry, updatedAt: Date.now() }, ...rest].slice(0, HISTORY_CAP);
  writeRaw(K.history, next);
}

export function removeProgress(id: string): void {
  writeRaw(
    K.history,
    readRaw<ProgressEntry[]>(K.history, []).filter((e) => e.id !== id),
  );
}

/** Union server history into the local store (login sync); newest wins per work. */
export function mergeHistory(entries: ProgressEntry[]): void {
  if (entries.length === 0) return;
  const byId = new Map(readRaw<ProgressEntry[]>(K.history, []).map((e) => [e.id, e]));
  for (const e of entries) {
    const cur = byId.get(e.id);
    if (!cur || e.updatedAt > cur.updatedAt) byId.set(e.id, e);
  }
  writeRaw(
    K.history,
    [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, HISTORY_CAP),
  );
}

/** Heal a stale stored cover with a freshly resolved one (catalog-first). */
export function updateProgressCover(id: string, imageUrl: string): void {
  const list = readRaw<ProgressEntry[]>(K.history, []);
  writeRaw(
    K.history,
    list.map((e) => (e.id === id ? { ...e, imageUrl } : e)),
  );
}

/* --------------------------------- read markers --------------------------- */

export function useReadChapters(mangaId: string): Set<string> {
  const map = useStore<Record<string, string[]>>(K.read, EMPTY_READ);
  // New Set per render is fine | callers use it for membership only.
  return new Set(map[mangaId] ?? []);
}

export function markChapterRead(mangaId: string, chapterId: string): void {
  const map = readRaw<Record<string, string[]>>(K.read, {});
  const current = map[mangaId] ?? [];
  if (current.includes(chapterId)) return;
  map[mangaId] = [chapterId, ...current].slice(0, READ_CAP_PER_WORK);
  writeRaw(K.read, map);
}

/* ----------------------------- offline downloads -------------------------- */

const EMPTY_DOWNLOADED: string[] = [];

export function useIsDownloaded(chapterId: string): boolean {
  return useStore<string[]>(K.downloaded, EMPTY_DOWNLOADED).includes(chapterId);
}

export function markDownloaded(chapterId: string): void {
  const list = readRaw<string[]>(K.downloaded, []);
  if (list.includes(chapterId)) return;
  writeRaw(K.downloaded, [chapterId, ...list]);
}

export function unmarkDownloaded(chapterId: string): void {
  writeRaw(
    K.downloaded,
    readRaw<string[]>(K.downloaded, []).filter((id) => id !== chapterId),
  );
}
