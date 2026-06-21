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
import { api, apiFresh } from "@/lib/orpc.server";
import { shouldOpenNovel } from "@/lib/reader-format";
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

  // Work context (needs m); kicked off now so it overlaps the body fetch below.
  const chaptersPromise = m ? api.manga.chapters({ id: m, name: mn }) : Promise.resolve(null);
  const corePromise = m ? api.manga.core({ id: m, name: mn }) : Promise.resolve(null);

  // Which reader to open. The chapter link's `f` wins; when it didn't carry one
  // (a shared URL, an older history entry, a connector that doesn't tag the
  // format) fall back to the work's own format. `core` is fast/cached.
  const fKnown = f === "novel" || f === "manga" || f === "manhwa" || f === "manhua";
  let isNovel = shouldOpenNovel(f, undefined);
  if (!fKnown && m) {
    const c = await corePromise.catch(() => null);
    isNovel = shouldOpenNovel(f, c?.core.format);
  }

  const sid = await getSessionId();
  const nowS = Math.floor(Date.now() / 1000);

  // Load the body for the guessed reader. A twin work (a series published as both
  // a manhwa and a web novel) or a mis-tagged chapter can land on the wrong
  // reader, so if the guess turns up nothing we flip and retry once. A persisted
  // novel copy short-circuits the network.
  const loadNovel = async (): Promise<{ html: string; title?: string } | null> => {
    const cached = await getCachedNovelChapter(id).catch(() => null);
    if (cached) return { html: cached.html, title: cached.title ?? undefined };
    try {
      const raw = await api.manga.chapterContent({ id });
      const clean = sanitizeProse(raw.html);
      if (!clean.trim()) return null;
      after(() => cacheNovelChapterOnRead(id, clean, { workId: m, title: raw.title }));
      return { html: clean, title: raw.title };
    } catch {
      return null;
    }
  };
  const loadPages = async (): Promise<string[] | null> => {
    try {
      const res = await api.manga.pages({ id });
      if (res.pages.length === 0) return null;
      return res.pages.map((p) => signPagePath(p, sid, nowS));
    } catch {
      return null;
    }
  };

  let novel: { html: string; title?: string } | null = null;
  let pages: string[] | null = null;
  if (isNovel) novel = await loadNovel();
  else pages = await loadPages();

  // The guess turned up nothing | flip and retry the other reader once.
  if (isNovel ? !novel : !pages) {
    if (isNovel) {
      pages = await loadPages();
      if (pages) isNovel = false;
    } else {
      novel = await loadNovel();
      if (novel) isNovel = true;
    }
  }

  if (isNovel ? !novel : !pages) {
    return <p className="notice">Não foi possível carregar este capítulo.</p>;
  }

  const [chaptersRes, coreRes] = await Promise.allSettled([chaptersPromise, corePromise]);
  let chapters =
    chaptersRes.status === "fulfilled" && chaptersRes.value ? chaptersRes.value.chapters : [];
  // A transient empty chapter fan-out pinned by the 6h catalog cache would strip
  // the reader nav (prev/next) | retry once uncached before giving up.
  if (chapters.length === 0 && m) {
    const fresh = await apiFresh.manga.chapters({ id: m, name: mn }).catch(() => null);
    if (fresh?.chapters.length) chapters = fresh.chapters;
  }
  const hasContext = chapters.length > 0 && !!m && !!mn;

  // Chapter number (sources return newest-first) + cover, for the
  // continue-reading history entry the reader records on the client.
  const idx = chapters.findIndex((c) => c.id === id);
  const chapterNo = idx >= 0 ? chapters.length - idx : undefined;
  const cover =
    coreRes.status === "fulfilled" && coreRes.value ? coreRes.value.core.imageUrl : undefined;
  const pageList = pages ?? [];

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
            {isNovel ? "Novel" : `${pageList.length} págs`}
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
          pages={pageList}
          mangaId={m}
          mangaName={mn}
          chapterId={id}
          chapterName={n}
          chapterNo={chapterNo}
          cover={cover}
        />
      )}

      {hasContext && (
        <ReaderChapterEnd chapters={chapters} currentId={id} mangaId={m} mangaName={mn} />
      )}

      <Comments targetType="chapter" targetId={id} />
    </>
  );
}
