import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DetailView } from "@/components/DetailView";
import { DisqusComments } from "@/components/DisqusComments";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Flag, langLabel } from "@/components/Flag";
import { Icon } from "@/components/Icon";
import { MarkdownDescription } from "@/components/MarkdownDescription";
import { StatusBadge } from "@/components/StatusBadge";
import { api } from "@/lib/orpc.server";

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
  let detail: Awaited<ReturnType<typeof api.manga.detail>>["detail"] | undefined;
  try {
    detail = (await api.manga.detail({ id, name: n })).detail;
  } catch {}

  const title = detail?.title ?? n ?? "Mangá";
  const description = detail?.description
    ? toPreview(detail.description, 200)
    : `Leia ${title} online — capítulos e detalhes.`;
  // The cover is public (signed `?k=`), so it's safe as the share/OG image.
  const images = detail?.imageUrl ? [detail.imageUrl] : undefined;

  return {
    title,
    description,
    openGraph: { title, description, type: "book", images },
    twitter: { card: "summary_large_image", title, description, images },
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
          <Icon name="arrow-left" size={16} /> voltar
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
  // Source language the chapters were actually fetched from — drives the
  // per-chapter flag in the list.
  const lang = data.lang;

  // Per-work language mix, computed from the merged chapters. A work can carry
  // some pt-br + some en chapters (different connectors), so we count each
  // language and surface the share — flags in the hero, percentages in "Sobre".
  const langCounts = new Map<string, number>();
  for (const c of chapters) {
    const code = (c.lang ?? lang).toLowerCase();
    langCounts.set(code, (langCounts.get(code) ?? 0) + 1);
  }
  const totalChapters = chapters.length || 1;
  const langBreakdown = [...langCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([code, count]) => ({ code, count, pct: Math.round((count / totalChapters) * 100) }));

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

      {langBreakdown.length > 0 && (
        <>
          <h3 className="section">Idiomas</h3>
          <ul className="lang-breakdown">
            {langBreakdown.map((b) => (
              <li key={b.code}>
                <Flag lang={b.code} size={20} title={langLabel(b.code)} />
                <span className="lang-name">{langLabel(b.code)}</span>
                <span className="lang-bar" aria-hidden="true">
                  <span className="lang-bar-fill" style={{ width: `${b.pct}%` }} />
                </span>
                <span className="lang-pct">{b.pct}%</span>
                <span className="lang-count muted">
                  {b.count} cap{b.count === 1 ? "." : "s."}
                </span>
              </li>
            ))}
          </ul>
        </>
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

  // Structured data so search engines render a rich book result (cover, rating,
  // genres). Image/URL absolute via SITE_URL; relative paths confuse some crawlers.
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: title,
    url: `${base}/manga/${id}`,
    ...(detail.imageUrl ? { image: `${base}${detail.imageUrl}` } : {}),
    ...(rawDesc ? { description: toPreview(rawDesc, 300) } : {}),
    ...(detail.author ? { author: { "@type": "Person", name: detail.author } } : {}),
    ...(detail.genre && detail.genre.length > 0 ? { genre: detail.genre } : {}),
    ...(meta.score !== undefined
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: meta.score,
            bestRating: 100,
            worstRating: 0,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Trusted, server-built JSON-LD (no user input).
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DetailView
        title={title}
        mangaId={id}
        lang={lang}
        chapters={chapters}
        characters={meta.characters}
        about={aboutTab}
        comments={
          <DisqusComments identifier={`manga-${id}`} title={title} url={`${base}/manga/${id}`} />
        }
        descPreview={descPreview}
        backdrop={meta.bannerImage ?? detail.imageUrl ?? undefined}
        cover={
          detail.imageUrl ? (
            <Image
              key="cover"
              className="detail-cover"
              src={detail.imageUrl}
              alt={title}
              width={160}
              height={240}
              sizes="160px"
              priority
            />
          ) : null
        }
        meta={
          <div className="detail-meta">
            <StatusBadge status={detail.status} size="md" />
            <span className="muted">{chapters.length} capítulos</span>
            {meta.score !== undefined && (
              <span className="score-pill">
                <Icon name="star" size={12} /> {meta.score}
              </span>
            )}
            {langBreakdown.length > 0 && (
              <span className="lang-flags" aria-label="Idiomas disponíveis">
                {langBreakdown.map((b) => (
                  <Flag key={b.code} lang={b.code} size={20} title={langLabel(b.code)} />
                ))}
              </span>
            )}
            <FavoriteButton id={id} name={title} imageUrl={detail.imageUrl} />
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
    </>
  );
}
