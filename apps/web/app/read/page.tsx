import Link from "next/link";
import type { Metadata } from "next";
import { api } from "@/lib/orpc.server";
import { imageSrc } from "@/lib/image";

export const dynamic = "force-dynamic";

type SP = Promise<{ source?: string; url?: string; title?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const { title } = await searchParams;
  return { title: title || "Leitor", robots: { index: false } };
}

export default async function ReadPage({ searchParams }: { searchParams: SP }) {
  const { source = "", url = "", title = "" } = await searchParams;

  let data: Awaited<ReturnType<typeof api.manga.pages>> | undefined;
  let error: string | null = null;
  try {
    data = await api.manga.pages({ source, url });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  if (error) return <p className="notice">{error}</p>;
  if (!data) return null;

  const { source: src, pages } = data;

  return (
    <>
      <div className="reader-nav">
        <Link className="btn" href={`/?source=${source}`}>← início</Link>
        <span className="muted" style={{ flex: 1 }}>
          {title} · <span className="src-pill">fonte: {src.name}</span> · {pages.length} págs
        </span>
      </div>

      <div className="pages">
        {pages.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} className="page-img" loading="lazy" src={imageSrc(source, p)} alt={`página ${i + 1}`} />
        ))}
      </div>

      {pages.length === 0 && <p className="muted">Nenhuma página retornada por esta fonte.</p>}
    </>
  );
}
