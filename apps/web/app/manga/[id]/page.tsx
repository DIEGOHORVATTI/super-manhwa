import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ChapterStats } from "@/components/ChapterStats";
import { DetailView } from "@/components/DetailView";
import { DisqusComments } from "@/components/DisqusComments";
import { FavoriteButton } from "@/components/FavoriteButton";
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
  let core: Awaited<ReturnType<typeof api.manga.core>>["core"] | undefined;
  try {
    core = (await api.manga.core({ id, name: n })).core;
  } catch {}

  const title = core?.title ?? n ?? "Mangá";
  const description = core?.description
    ? toPreview(core.description, 200)
    : `Leia ${title} online — capítulos e detalhes.`;
  // The cover is public (signed `?k=`), so it's safe as the share/OG image.
  const images = core?.imageUrl ? [core.imageUrl] : undefined;

  return {
    title,
    description,
    openGraph: { title, description, type: "book", images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function MangaPage({ params, searchParams }: { params: P; searchParams: SP }) {
  const [{ id }, { n }] = await Promise.all([params, searchParams]);

  // Fast half: work metadata (AniList, cached) — paints the hero immediately.
  let coreData: Awaited<ReturnType<typeof api.manga.core>> | undefined;
  let error: string | null = null;
  try {
    coreData = await api.manga.core({ id, name: n });
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
  if (!coreData) return null;

  const { core, lang } = coreData;
  const title = core.title ?? n ?? "Mangá";

  // Slow half: cross-source chapter fan-out — streamed, NOT awaited. The promise
  // is handed to the client components, which suspend behind skeletons while it
  // resolves. A failure degrades to an empty list so the page still renders.
  const chaptersPromise = api.manga.chapters({ id, name: n }).catch(() => ({ chapters: [], lang }));

  // Rich metadata (AniList) — best-effort, never blocks the page meaningfully.
  const { meta } = await api.manga.meta({ name: title }).catch(() => ({
    meta: { tags: [], characters: [], relations: [] } as Awaited<
      ReturnType<typeof api.manga.meta>
    >["meta"],
  }));

  const aboutTab = (
    <div className="about">
      {core.description ? (
        <MarkdownDescription text={core.description} />
      ) : meta.description ? (
        <MarkdownDescription text={meta.description} />
      ) : (
        <p className="muted">Sem sinopse disponível.</p>
      )}

      {(core.author || meta.score !== undefined) && (
        <dl className="about-facts">
          {core.author && (
            <div>
              <dt>Autor</dt>
              <dd>{core.author}</dd>
            </div>
          )}
          {core.artist && (
            <div>
              <dt>Arte</dt>
              <dd>{core.artist}</dd>
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

      <Suspense fallback={null}>
        <ChapterStats promise={chaptersPromise} lang={lang} variant="breakdown" />
      </Suspense>

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
            {meta.relations.map((r, i) => (
              <li key={`${r.relation}-${r.title}-${i}`}>
                <span className="relation-kind">{r.relation}</span>{" "}
                <Link href={`/explorar?q=${encodeURIComponent(r.title)}`} className="relation-link">
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );

  // Header sinopse teaser — falls back to AniList's description when the catalog
  // didn't carry one. Plain text, since the full markdown lives in "Sobre".
  const rawDesc = core.description || meta.description || "";
  const descPreview = rawDesc ? toPreview(rawDesc) : undefined;

  // Structured data so search engines render a rich book result (cover, rating,
  // genres). Image/URL absolute via SITE_URL; relative paths confuse some crawlers.
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: title,
    url: `${base}/manga/${id}`,
    ...(core.imageUrl ? { image: `${base}${core.imageUrl}` } : {}),
    ...(rawDesc ? { description: toPreview(rawDesc, 300) } : {}),
    ...(core.author ? { author: { "@type": "Person", name: core.author } } : {}),
    ...(core.genre && core.genre.length > 0 ? { genre: core.genre } : {}),
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

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: base },
      { "@type": "ListItem", position: 2, name: "Explorar", item: `${base}/explorar` },
      { "@type": "ListItem", position: 3, name: title, item: `${base}/manga/${id}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Trusted, server-built JSON-LD (no user input).
        dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumbLd]) }}
      />
      <DetailView
        title={title}
        mangaId={id}
        lang={lang}
        chaptersPromise={chaptersPromise}
        characters={meta.characters}
        about={aboutTab}
        comments={
          <DisqusComments identifier={`manga-${id}`} title={title} url={`${base}/manga/${id}`} />
        }
        descPreview={descPreview}
        backdrop={meta.bannerImage ?? core.imageUrl ?? undefined}
        cover={
          core.imageUrl ? (
            <Image
              key="cover"
              className="detail-cover"
              src={core.imageUrl}
              alt={title}
              width={160}
              height={240}
              sizes="160px"
              priority
            />
          ) : null
        }
        meta={
          <div key="meta" className="detail-meta">
            <StatusBadge status={core.status} size="md" />
            <Suspense
              fallback={
                <span
                  className="muted skel skel-line"
                  style={{ width: 90, height: 14, display: "inline-block" }}
                />
              }
            >
              <ChapterStats promise={chaptersPromise} lang={lang} variant="flags" />
            </Suspense>
            {meta.score !== undefined && (
              <span className="score-pill">
                <Icon name="star" size={12} /> {meta.score}
              </span>
            )}
            <FavoriteButton id={id} name={title} imageUrl={core.imageUrl} />
          </div>
        }
        genres={
          core.genre && core.genre.length > 0 ? (
            <div key="genres" className="genres">
              {core.genre.slice(0, 16).map((g) => (
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
