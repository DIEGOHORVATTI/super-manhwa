"use client";
import { useEffect, useRef } from "react";
import { useSession } from "@/lib/auth/client";
import { mergeFavorites, mergeHistory, useFavorites, useHistory } from "@/lib/library";
import { rpc } from "@/lib/rpc/client";

/**
 * On sign-in, two-way syncs the local library with the DB: pushes the browser's
 * localStorage favorites/history up (so nothing added while logged out is lost),
 * then merges the server's set back down (so a fresh device shows the shelf).
 * Runs once per user id. Anonymous → no-op. Mounted globally in the layout so the
 * merge lands before the user opens the library or the home "continuar lendo".
 */
export function LibrarySync() {
  const { data: session } = useSession();
  const uid = session?.user?.id;
  const favs = useFavorites();
  const hist = useHistory();
  // Read once at sync time without making them effect deps (would re-sync on every change).
  const favsRef = useRef(favs);
  favsRef.current = favs;
  const histRef = useRef(hist);
  histRef.current = hist;
  const doneFor = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!uid || doneFor.current === uid) return;
    doneFor.current = uid;

    rpc.library
      .syncFavorites({
        items: favsRef.current.map((f) => ({ workId: f.id, name: f.name, imageUrl: f.imageUrl })),
      })
      .then((r) =>
        mergeFavorites(
          r.items.map((x) => ({
            id: x.workId,
            name: x.name,
            imageUrl: x.imageUrl ?? undefined,
            addedAt: new Date(x.addedAt).getTime(),
          })),
        ),
      )
      .catch(() => {});

    rpc.library
      .syncProgress({
        items: histRef.current.map((h) => ({
          workId: h.id,
          name: h.name,
          imageUrl: h.imageUrl,
          chapterId: h.chapterId,
          chapterName: h.chapterName,
          chapterNo: h.chapterNo,
        })),
      })
      .then((r) =>
        mergeHistory(
          r.items.map((x) => ({
            id: x.workId,
            name: x.name,
            imageUrl: x.imageUrl ?? undefined,
            chapterId: x.chapterId,
            chapterName: x.chapterName ?? undefined,
            chapterNo: x.chapterNo ?? undefined,
            updatedAt: new Date(x.updatedAt).getTime(),
          })),
        ),
      )
      .catch(() => {});
  }, [uid]);

  return null;
}
