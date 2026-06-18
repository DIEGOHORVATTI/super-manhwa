import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { Comments } from "@/components/Comments";
import { Icon } from "@/components/Icon";
import { NovelReader } from "@/components/NovelReader";
import { ReaderSettings } from "@/components/ReaderSettings";
import { ReaderChapterEnd } from "@/components/ReaderChapterEnd";
import { ReaderNav } from "@/components/ReaderNav";
import { ReaderPages } from "@/components/ReaderPages";
import { cacheNovelChapterOnRead, getCachedNovelChapter } from "@/lib/cache-works";
import { signPagePath } from "@/lib/image-sign";
import { api } from "@/lib/orpc.server";
import { routes } from "@/lib/routes";
import { sanitizeProse } from "@/lib/sanitize-prose";
import { getSessionId } from "@/lib/session";

// Not force-dynamic: reading the session cookie already opts this route into
// dynamic rendering (signed page URLs must never be cached cross-user), while
// the page-list fetch underneath still benefits from the Data Cache.

type P = Promise<{ id: string }>;
type SP = Promise<{ n?: string; m?: string; mn?: string; f?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const { n, mn } = await searchParams;
  const title = mn ? `${mn} | ${n ?? "capítulo"}` : n || "Leitor";
  return { title, robots: { index: false } };
}

export default async function ReadPage({ params, searchParams }: { params: P; searchParams: SP }) {
  const [{ id }, { n, m, mn, f }] = await Promise.all([params, searchParams]);
  const isNovel = f === "novel";

  // Body (pages OR novel prose) + manga chapters + cover. Chapters/cover only if
  // we know the work (m=…) | they power the reader nav and continue-reading entry.
  const [bodyRes, chaptersRes, coreRes] = await Promise.allSettled([
    isNovel ? api.manga.chapterContent({ id }) : api.manga.pages({ id }),
    m ? api.manga.chapters({ id: m, name: mn }) : Promise.resolve(null),
    m ? api.manga.core({ id: m, name: mn }) : Promise.resolve(null),
  ]);

  if (bodyRes.status === "rejected") {
    const err = bodyRes.reason instanceof Error ? bodyRes.reason.message : String(bodyRes.reason);
    return <p className="notice">{err}</p>;
  }

  // Novel: serve our persisted copy or sanitize + persist the source prose on read.
  let novel: { html: string; title?: string } | null = null;
  if (isNovel) {
    const cachedNovel = await getCachedNovelChapter(id);
    if (cachedNovel) {
      novel = { html: cachedNovel.html, title: cachedNovel.title ?? undefined };
    } else {
      const raw = bodyRes.value as Awaited<ReturnType<typeof api.manga.chapterContent>>;
      const clean = sanitizeProse(raw.html);
      novel = { html: clean, title: raw.title };
      // Persist on demand (best-effort, after the response streams).
      after(() => cacheNovelChapterOnRead(id, clean, { workId: m, title: raw.title }));
    }
  }

  // Bind each page image to this visitor's session so a copied URL can't be
  // opened in another browser / incognito (see lib/image-sign).
  const sid = await getSessionId();
  const nowS = Math.floor(Date.now() / 1000);
  const pages = isNovel
    ? []
    : (bodyRes.value as Awaited<ReturnType<typeof api.manga.pages>>).pages.map((p) =>
        signPagePath(p, sid, nowS),
      );
  const chapters =
    chaptersRes.status === "fulfilled" && chaptersRes.value ? chaptersRes.value.chapters : [];

  const hasContext = chapters.length > 0 && !!m && !!mn;

  // Chapter number (sources return newest-first) + cover, for the
  // continue-reading history entry the reader records on the client.
  const idx = chapters.findIndex((c) => c.id === id);
  const chapterNo = idx >= 0 ? chapters.length - idx : undefined;
  const cover =
    coreRes.status === "fulfilled" && coreRes.value ? coreRes.value.core.imageUrl : undefined;

  return (
    <>
      {hasContext ? (
        <ReaderNav chapters={chapters} currentId={id} mangaId={m} mangaName={mn} />
      ) : (
        // Fallback minimal bar when we lack manga context (e.g. URL shared without ?m=)
        <div className="reader-nav">
          <Link className="reader-btn reader-btn-series" href={routes.home}>
            <Icon name="house" size={16} />
            <span className="reader-series-name">Início</span>
          </Link>
          <ReaderSettings />
          <div className="reader-nav-spacer" />
          <span className="reader-count">
            {n ? `${n} · ` : ""}
            {isNovel ? "Novel" : `${pages.length} págs`}
          </span>
        </div>
      )}

      {isNovel && novel ? (
        <NovelReader
          html={novel.html}
          mangaId={m}
          mangaName={mn}
          chapterId={id}
          chapterName={n}
          chapterNo={chapterNo}
          cover={cover}
        />
      ) : (
        <ReaderPages
          pages={pages}
          mangaId={m}
          mangaName={mn}
          chapterId={id}
          chapterName={n}
          chapterNo={chapterNo}
          cover={cover}
        />
      )}

      {!isNovel && pages.length === 0 && <p className="muted">Nenhuma página retornada.</p>}

      {hasContext && (
        <ReaderChapterEnd chapters={chapters} currentId={id} mangaId={m} mangaName={mn} />
      )}

      <Comments targetType="chapter" targetId={id} />
    </>
  );
}
