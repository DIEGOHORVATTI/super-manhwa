"use client";
import { useEffect, useRef, useState } from "react";
import { dbRecordProgress } from "@/lib/library-db";
import { markChapterRead, recordProgress } from "@/lib/library";
import { rpc } from "@/lib/rpc/client";

const PRELOAD_AHEAD = 4;
const MAX_RETRIES = 3;

/**
 * A single page image that recovers from a flaky CDN: on error it reloads the
 * signed URL (cache-busted) with backoff up to MAX_RETRIES, then shows a
 * tap-to-reload fallback. Keeps `data-idx` so the preload/mark-read observer
 * still tracks it even when it fails.
 */
function ReaderPage({ src, idx }: { src: string; idx: number }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  const onError = () => {
    if (attempt < MAX_RETRIES) {
      const delay = attempt === 0 ? 600 : 1500;
      setTimeout(() => setAttempt((a) => a + 1), delay);
    } else {
      setFailed(true);
    }
  };

  if (failed) {
    return (
      <div className="page-img page-img-fallback" data-idx={idx}>
        <span>Não foi possível carregar a página {idx + 1}.</span>
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            setAttempt((a) => a + 1);
          }}
        >
          Recarregar
        </button>
      </div>
    );
  }

  const url = attempt === 0 ? src : `${src}${src.includes("?") ? "&" : "?"}r=${attempt}`;
  return (
    <img
      data-idx={idx}
      className="page-img"
      loading={idx < 2 ? "eager" : "lazy"}
      src={url}
      alt={`página ${idx + 1}`}
      onError={onError}
    />
  );
}

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

  // Mark the document as "in reader" so global chrome (footer) hides via CSS.
  // Lives here (always mounted) | the toolbar has a context-less fallback path.
  useEffect(() => {
    document.documentElement.dataset.reader = "1";
    return () => {
      delete document.documentElement.dataset.reader;
    };
  }, []);

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
    // Continue-reading mirror to our DB (cross-device shelf). Best-effort.
    dbRecordProgress({
      workId: mangaId,
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
    const imgs = Array.from(root.querySelectorAll<HTMLElement>("[data-idx]"));
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
        <ReaderPage key={i} src={p} idx={i} />
      ))}
    </div>
  );
}
