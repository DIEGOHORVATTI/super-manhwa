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
 * logged-out/empty state and the client fills it in after hydration — these are
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
    /* quota / private mode — degrade silently */
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

/** Idempotent add (used by the AniList import — never removes). */
export function addFavorite(entry: Omit<LibEntry, "addedAt">): void {
  const list = readRaw<LibEntry[]>(K.favorites, []);
  if (list.some((f) => f.id === entry.id)) return;
  writeRaw(K.favorites, [{ ...entry, addedAt: Date.now() }, ...list]);
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

/* --------------------------------- read markers --------------------------- */

export function useReadChapters(mangaId: string): Set<string> {
  const map = useStore<Record<string, string[]>>(K.read, EMPTY_READ);
  // New Set per render is fine — callers use it for membership only.
  return new Set(map[mangaId] ?? []);
}

export function markChapterRead(mangaId: string, chapterId: string): void {
  const map = readRaw<Record<string, string[]>>(K.read, {});
  const current = map[mangaId] ?? [];
  if (current.includes(chapterId)) return;
  map[mangaId] = [chapterId, ...current].slice(0, READ_CAP_PER_WORK);
  writeRaw(K.read, map);
}
