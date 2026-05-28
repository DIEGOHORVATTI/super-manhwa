import Link from "next/link";
import type { Metadata } from "next";
import { api } from "@/lib/orpc.server";
import { imageSrc } from "@/lib/image";

export const dynamic = "force-dynamic";

const STATUS: Record<number, string> = {
  0: "Em andamento", 1: "Completo", 2: "Hiato", 3: "Cancelado", 4: "Publicação finalizada",
};

type SP = Promise<{ source?: string; url?: string; title?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const { title } = await searchParams;
  const name = title || "Mangá";
  return {
    title: name,
    description: `Leia ${name} online — capítulos e detalhes.`,
    openGraph: { title: name, type: "book" },
  };
}

export default async function MangaPage({ searchParams }: { searchParams: SP }) {
  const { source = "", url = "", title = "" } = await searchParams;

  let data: Awaited<ReturnType<typeof api.manga.detail>> | undefined;
  let error: string | null = null;
  try {
    data = await api.manga.detail({ source, url });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  if (error) return <p className="notice">{error}</p>;
  if (!data) return null;

  const { source: src, detail } = data;
  const chapters = detail.chapters ?? [];

  return (
    <>
      <Link className="back" href={`/?source=${source}`}>← voltar</Link>

      <div className="detail-head">
        {detail.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="detail-cover" src={imageSrc(source, detail.imageUrl)} alt={detail.title || title} />
        )}
        <div>
          <h1 className="detail-title">{detail.title || title}</h1>
          <p><span className="src-pill">fonte: {src.name}</span></p>
          {detail.author && <p className="muted">por {detail.author}</p>}
          <p className="muted">{STATUS[detail.status ?? 5] ?? "—"} · {chapters.length} capítulos</p>
          {detail.genre && detail.genre.length > 0 && (
            <div className="genres">{detail.genre.slice(0, 12).map((g) => <span key={g} className="tag">{g}</span>)}</div>
          )}
        </div>
      </div>

      {detail.description && <p className="detail-desc">{detail.description}</p>}

      <h2 className="section">Capítulos</h2>
      {chapters.length === 0 && <p className="muted">Nenhum capítulo disponível nesta fonte.</p>}
      <ul className="chapters-grid">
        {chapters.map((c, i) => (
          <li key={c.url + i}>
            <Link
              className="chip"
              href={`/read?source=${source}&url=${encodeURIComponent(c.url)}&title=${encodeURIComponent(c.name)}`}
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
