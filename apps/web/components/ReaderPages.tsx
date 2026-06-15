"use client";
import { useEffect, useRef } from "react";
import { markChapterRead, recordProgress } from "@/lib/library";
import { rpc } from "@/lib/rpc/client";

const PRELOAD_AHEAD = 4;

/**
 * Webtoon page strip with eager preloading. Images render lazily, but as each
 * page scrolls into view we warm the next few via `new Image()` so the reader
 * never waits on the lazy loader mid-scroll. Also drives local persistence:
 * records "continue reading" on mount and marks the chapter read once the last
 * page is reached. All client-side | the signed page URLs come pre-built from
 * the server.
 */
export function ReaderPages({
  pages,
  mangaId,
  mangaName,
  chapterId,
  chapterName,
  chapterNo,
  cover,
}: {
  pages: string[];
  mangaId?: string;
  mangaName?: string;
  chapterId: string;
  chapterName?: string;
  chapterNo?: number;
  cover?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const preloaded = useRef(new Set<number>());

  // Record "continue reading" as soon as the chapter opens (needs work context).
  useEffect(() => {
    if (!mangaId || !mangaName) return;
    recordProgress({
      id: mangaId,
      name: mangaName,
      imageUrl: cover,
      chapterId,
      chapterName,
      chapterNo,
    });
    // Server-side reading tracker (badges). Fire-and-forget; auth errors for anon are fine.
    void rpc.reading.track({ workId: mangaId, chapterId }).catch(() => {});
  }, [mangaId, mangaName, cover, chapterId, chapterName, chapterNo]);

  // Preload-ahead + mark-read when the last page is seen.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const imgs = Array.from(root.querySelectorAll<HTMLImageElement>("img[data-idx]"));
    if (imgs.length === 0) return;

    const warm = (idx: number) => {
      for (let j = idx + 1; j <= idx + PRELOAD_AHEAD && j < pages.length; j++) {
        if (preloaded.current.has(j)) continue;
        preloaded.current.add(j);
        const img = new Image();
        img.src = pages[j];
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = Number((entry.target as HTMLElement).dataset.idx);
          warm(idx);
          if (idx === pages.length - 1 && mangaId) markChapterRead(mangaId, chapterId);
        }
      },
      { rootMargin: "600px 0px" },
    );
    for (const img of imgs) observer.observe(img);
    return () => observer.disconnect();
  }, [pages, mangaId, chapterId]);

  return (
    <div className="pages" ref={containerRef}>
      {pages.map((p, i) => (
        <img
          key={i}
          data-idx={i}
          className="page-img"
          loading={i < 2 ? "eager" : "lazy"}
          src={p}
          alt={`página ${i + 1}`}
        />
      ))}
    </div>
  );
}
