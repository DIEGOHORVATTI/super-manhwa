import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ReaderChapterEnd } from "@/components/ReaderChapterEnd";
import { ReaderNav } from "@/components/ReaderNav";
import { api } from "@/lib/orpc.server";

export const dynamic = "force-dynamic";

type P = Promise<{ id: string }>;
type SP = Promise<{ n?: string; m?: string; mn?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const { n, mn } = await searchParams;
  const title = mn ? `${mn} — ${n ?? "capítulo"}` : n || "Leitor";
  return { title, robots: { index: false } };
}

export default async function ReadPage({ params, searchParams }: { params: P; searchParams: SP }) {
  const [{ id }, { n, m, mn }] = await Promise.all([params, searchParams]);

  // Pages always; manga detail only if we know the manga (m=…) — it powers the
  // reader nav (prev/next + chapter combobox). Both fired in parallel.
  const [pagesRes, detailRes] = await Promise.allSettled([
    api.manga.pages({ id }),
    m ? api.manga.detail({ id: m, name: mn }) : Promise.resolve(null),
  ]);

  if (pagesRes.status === "rejected") {
    const err =
      pagesRes.reason instanceof Error ? pagesRes.reason.message : String(pagesRes.reason);
    return <p className="notice">{err}</p>;
  }
  const { pages } = pagesRes.value;
  const chapters =
    detailRes.status === "fulfilled" && detailRes.value
      ? (detailRes.value.detail.chapters ?? [])
      : [];

  const hasContext = chapters.length > 0 && !!m && !!mn;

  return (
    <>
      {hasContext ? (
        <ReaderNav chapters={chapters} currentId={id} mangaId={m} mangaName={mn} />
      ) : (
        // Fallback minimal bar when we lack manga context (e.g. URL shared without ?m=)
        <div className="reader-nav">
          <Link className="reader-btn reader-btn-series" href="/">
            <Icon name="house" size={16} />
            <span className="reader-series-name">Início</span>
          </Link>
          <div className="reader-nav-spacer" />
          <span className="reader-count">
            {n ? `${n} · ` : ""}
            {pages.length} págs
          </span>
        </div>
      )}

      <div className="pages">
        {pages.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} className="page-img" loading="lazy" src={p} alt={`página ${i + 1}`} />
        ))}
      </div>

      {pages.length === 0 && <p className="muted">Nenhuma página retornada.</p>}

      {hasContext && (
        <ReaderChapterEnd chapters={chapters} currentId={id} mangaId={m} mangaName={mn} />
      )}
    </>
  );
}
