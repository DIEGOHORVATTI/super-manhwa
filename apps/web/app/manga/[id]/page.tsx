import type { Metadata } from "next";
import Link from "next/link";
import { DetailView } from "@/components/DetailView";
import { MarkdownDescription } from "@/components/MarkdownDescription";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/orpc.server";

export const dynamic = "force-dynamic";

/** Markdown/HTML → plain text, clamped — used for the header sinopse teaser. */
const toPreview = (text: string, max = 240) => {
  const plain = text
    .replace(/<[^>]+>/g, " ") // html tags
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // md links/images → label
    .replace(/[*_`~#>]/g, "") // md emphasis / headings
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? `${plain.slice(0, max).trimEnd()}…` : plain;
};

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

  // Rich metadata (AniList) — best-effort, never blocks the page.
  const { meta } = await api.manga.meta({ name: title }).catch(() => ({
    meta: { tags: [], characters: [], relations: [] } as Awaited<
      ReturnType<typeof api.manga.meta>
    >["meta"],
  }));

  const aboutTab = (
    <div className="about">
      {detail.description ? (
        <MarkdownDescription text={detail.description} />
      ) : meta.description ? (
        <MarkdownDescription text={meta.description} />
      ) : (
        <p className="muted">Sem sinopse disponível.</p>
      )}

      {(detail.author || meta.score !== undefined) && (
        <dl className="about-facts">
          {detail.author && (
            <div>
              <dt>Autor</dt>
              <dd>{detail.author}</dd>
            </div>
          )}
          {detail.artist && (
            <div>
              <dt>Arte</dt>
              <dd>{detail.artist}</dd>
            </div>
          )}
          {meta.score !== undefined && (
            <div>
              <dt>Nota</dt>
              <dd>{meta.score}/100</dd>
            </div>
          )}
        </dl>
      )}

      {meta.tags.length > 0 && (
        <>
          <h3 className="section">Tags</h3>
          <div className="genres">
            {meta.tags.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
          </div>
        </>
      )}

      {meta.relations.length > 0 && (
        <>
          <h3 className="section">Relacionados</h3>
          <ul className="relations">
            {meta.relations.map((r) => (
              <li key={`${r.relation}-${r.title}`}>
                <span className="relation-kind">{r.relation}</span> {r.title}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );

  // Header sinopse teaser — falls back to AniList's description when the source
  // connector didn't carry one. Plain text, since the full markdown lives in "Sobre".
  const rawDesc = detail.description || meta.description || "";
  const descPreview = rawDesc ? toPreview(rawDesc) : undefined;

  return (
    <DetailView
      title={title}
      mangaId={id}
      chapters={chapters}
      characters={meta.characters}
      about={aboutTab}
      descPreview={descPreview}
      backdrop={meta.bannerImage ?? detail.imageUrl ?? undefined}
      cover={
        detail.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="detail-cover" src={detail.imageUrl} alt={title} />
        ) : null
      }
      meta={
        <div className="detail-meta">
          <StatusBadge status={detail.status} size="md" />
          <span className="muted">{chapters.length} capítulos</span>
          {meta.score !== undefined && <span className="score-pill">★ {meta.score}</span>}
        </div>
      }
      genres={
        detail.genre && detail.genre.length > 0 ? (
          <div className="genres">
            {detail.genre.slice(0, 16).map((g) => (
              <Link key={g} href={`/g/${slugifyGenre(g)}`} className="tag tag-link">
                {g}
              </Link>
            ))}
          </div>
        ) : null
      }
    />
  );
}
