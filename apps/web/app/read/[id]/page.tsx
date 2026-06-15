import type { Metadata } from "next";
import Link from "next/link";
import { Comments } from "@/components/Comments";
import { DownloadChapterButton } from "@/components/DownloadChapterButton";
import { Icon } from "@/components/Icon";
import { ReaderChapterEnd } from "@/components/ReaderChapterEnd";
import { ReaderNav } from "@/components/ReaderNav";
import { ReaderPages } from "@/components/ReaderPages";
import { signPagePath } from "@/lib/image-sign";
import { api } from "@/lib/orpc.server";
import { getSessionId } from "@/lib/session";

// Not force-dynamic: reading the session cookie already opts this route into
// dynamic rendering (signed page URLs must never be cached cross-user), while
// the page-list fetch underneath still benefits from the Data Cache.

type P = Promise<{ id: string }>;
type SP = Promise<{ n?: string; m?: string; mn?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const { n, mn } = await searchParams;
  const title = mn ? `${mn} | ${n ?? "capítulo"}` : n || "Leitor";
  return { title, robots: { index: false } };
}

export default async function ReadPage({ params, searchParams }: { params: P; searchParams: SP }) {
  const [{ id }, { n, m, mn }] = await Promise.all([params, searchParams]);

  // Pages always; manga chapters + cover only if we know the manga (m=…) | they
  // power the reader nav (prev/next + chapter combobox) and the continue-reading
  // history entry. All fired in parallel.
  const [pagesRes, chaptersRes, coreRes] = await Promise.allSettled([
    api.manga.pages({ id }),
    m ? api.manga.chapters({ id: m, name: mn }) : Promise.resolve(null),
    m ? api.manga.core({ id: m, name: mn }) : Promise.resolve(null),
  ]);

  if (pagesRes.status === "rejected") {
    const err =
      pagesRes.reason instanceof Error ? pagesRes.reason.message : String(pagesRes.reason);
    return <p className="notice">{err}</p>;
  }
  // Bind each page image to this visitor's session so a copied URL can't be
  // opened in another browser / incognito (see lib/image-sign).
  const sid = await getSessionId();
  const nowS = Math.floor(Date.now() / 1000);
  const pages = pagesRes.value.pages.map((p) => signPagePath(p, sid, nowS));
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
        <ReaderNav chapters={chapters} currentId={id} mangaId={m} mangaName={mn} pages={pages} />
      ) : (
        // Fallback minimal bar when we lack manga context (e.g. URL shared without ?m=)
        <div className="reader-nav">
          <Link className="reader-btn reader-btn-series" href="/">
            <Icon name="house" size={16} />
            <span className="reader-series-name">Início</span>
          </Link>
          <DownloadChapterButton pages={pages} chapterId={id} />
          <div className="reader-nav-spacer" />
          <span className="reader-count">
            {n ? `${n} · ` : ""}
            {pages.length} págs
          </span>
        </div>
      )}

      <ReaderPages
        pages={pages}
        mangaId={m}
        mangaName={mn}
        chapterId={id}
        chapterName={n}
        chapterNo={chapterNo}
        cover={cover}
      />

      {pages.length === 0 && <p className="muted">Nenhuma página retornada.</p>}

      {hasContext && (
        <ReaderChapterEnd chapters={chapters} currentId={id} mangaId={m} mangaName={mn} />
      )}

      <Comments targetType="chapter" targetId={id} />
    </>
  );
}
