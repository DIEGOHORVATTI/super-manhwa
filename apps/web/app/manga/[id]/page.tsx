import type { Metadata } from "next";
import Link from "next/link";
import { MarkdownDescription } from "@/components/MarkdownDescription";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/orpc.server";

export const dynamic = "force-dynamic";

type P = Promise<{ id: string }>;
type SP = Promise<{ n?: string }>;

/** URL-friendly slug for the genre route — must round-trip with the backend's normGenre. */
const slugifyGenre = (g: string) =>
  g
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: P;
  searchParams: SP;
}): Promise<Metadata> {
  const [{ id }, { n }] = await Promise.all([params, searchParams]);
  let name = n;
  if (!name) {
    try {
      name = (await api.manga.detail({ id })).detail.title;
    } catch {}
  }
  const title = name ?? "Mangá";
  return {
    title,
    description: `Leia ${title} online — capítulos e detalhes.`,
    openGraph: { title, type: "book" },
  };
}

export default async function MangaPage({ params, searchParams }: { params: P; searchParams: SP }) {
  const [{ id }, { n }] = await Promise.all([params, searchParams]);

  let data: Awaited<ReturnType<typeof api.manga.detail>> | undefined;
  let error: string | null = null;
  try {
    data = await api.manga.detail({ id, name: n });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  if (error) {
    return (
      <>
        <Link className="back" href="/">
          ← voltar
        </Link>
        <p className="notice">
          Não foi possível carregar esta obra em nenhuma das integrações disponíveis. A fonte
          original retornou um erro e nenhuma alternativa tem o título no catálogo.
        </p>
        <details className="muted" style={{ marginTop: 8 }}>
          <summary>detalhes técnicos</summary>
          <code style={{ fontSize: 12 }}>{error}</code>
        </details>
      </>
    );
  }
  if (!data) return null;

  const { detail } = data;
  const title = detail.title ?? n ?? "Mangá";
  const chapters = detail.chapters ?? [];

  return (
    <>
      <Link className="back" href="/">
        ← voltar
      </Link>

      <div className="detail-head">
        {detail.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="detail-cover" src={detail.imageUrl} alt={title} />
        )}
        <div>
          <h1 className="detail-title">{title}</h1>
          <div className="detail-meta">
            <StatusBadge status={detail.status} size="md" />
            <span className="muted">{chapters.length} capítulos</span>
          </div>
          {detail.genre && detail.genre.length > 0 && (
            <div className="genres">
              {detail.genre.slice(0, 16).map((g) => (
                <Link key={g} href={`/g/${slugifyGenre(g)}`} className="tag tag-link">
                  {g}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {detail.description && <MarkdownDescription text={detail.description} />}

      <h2 className="section">Capítulos</h2>
      {chapters.length === 0 && <p className="muted">Nenhum capítulo disponível.</p>}
      <ul className="chapters-grid">
        {chapters.map((c) => (
          <li key={c.id}>
            <Link
              className="chip"
              href={`/read/${c.id}?m=${id}&mn=${encodeURIComponent(title)}&n=${encodeURIComponent(c.name)}`}
            >
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
