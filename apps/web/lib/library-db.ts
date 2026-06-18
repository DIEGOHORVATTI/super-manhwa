"use client";
import { rpc } from "@/lib/rpc/client";

/**
 * Server mirror of the local library (lib/library.ts). These dual-write to the
 * DB alongside the localStorage writes, so a signed-in user's shelf survives
 * across devices. All calls are best-effort | failures (incl. anonymous →
 * UNAUTHORIZED) are swallowed; localStorage stays the source of truth for the UI.
 */

export function dbFavorite(
  entry: { workId: string; name: string; imageUrl?: string },
  favorited: boolean,
): void {
  const p = favorited
    ? rpc.library.favorite(entry)
    : rpc.library.unfavorite({ workId: entry.workId });
  p.catch(() => {});
}

export function dbRecordProgress(entry: {
  workId: string;
  name: string;
  imageUrl?: string;
  chapterId: string;
  chapterName?: string;
  chapterNo?: number;
}): void {
  rpc.library.recordProgress(entry).catch(() => {});
}
