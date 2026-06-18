"use client";
import { useEffect, useRef } from "react";
import { dbRecordProgress } from "@/lib/library-db";
import { markChapterRead, recordProgress } from "@/lib/library";
import { rpc } from "@/lib/rpc/client";

/**
 * Text twin of {@link ReaderPages}: renders a novel chapter's sanitized prose and
 * drives the same local persistence | "continue reading" on open, server reading
 * tracker, and mark-read once the reader scrolls past the end sentinel.
 *
 * `html` arrives already sanitized (prose whitelist, server-side), so the
 * `dangerouslySetInnerHTML` here only ever sees allow-listed tags with no attrs.
 */
export function NovelReader({
  html,
  mangaId,
  mangaName,
  chapterId,
  chapterName,
  chapterNo,
  cover,
}: {
  html: string;
  mangaId?: string;
  mangaName?: string;
  chapterId: string;
  chapterName?: string;
  chapterNo?: number;
  cover?: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.dataset.reader = "1";
    return () => {
      delete document.documentElement.dataset.reader;
    };
  }, []);

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
    dbRecordProgress({
      workId: mangaId,
      name: mangaName,
      imageUrl: cover,
      chapterId,
      chapterName,
      chapterNo,
    });
    void rpc.reading.track({ workId: mangaId, chapterId }).catch(() => {});
  }, [mangaId, mangaName, cover, chapterId, chapterName, chapterNo]);

  // Mark read when the end of the chapter scrolls into view.
  useEffect(() => {
    const end = endRef.current;
    if (!end || !mangaId) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) markChapterRead(mangaId, chapterId);
        }
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(end);
    return () => observer.disconnect();
  }, [mangaId, chapterId]);

  return (
    <article className="reader-novel">
      {/* Sanitized server-side to a prose whitelist (lib/sanitize-prose). */}
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: prose is sanitized upstream */}
      <div className="reader-novel-prose" dangerouslySetInnerHTML={{ __html: html }} />
      <div ref={endRef} aria-hidden="true" />
    </article>
  );
}
