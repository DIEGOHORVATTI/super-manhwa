import type { Metadata } from "next";
import { env } from "@/lib/env";
import Image from "next/image";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { after } from "next/server";
import { Suspense } from "react";
import { ChapterStats } from "@/components/ChapterStats";
import { Comments } from "@/components/Comments";
import { DetailView } from "@/components/DetailView";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Icon } from "@/components/Icon";
import { MarkdownDescription } from "@/components/MarkdownDescription";
import { StatusBadge } from "@/components/StatusBadge";
import { buildAltTitles } from "@/lib/alt-titles";
import { cacheChaptersOnRead, cacheWorkOnRead, getCachedWork } from "@/lib/cache-works";
import { api } from "@/lib/orpc.server";
import { deslugify, slugify } from "@/lib/slug";
import { translatePt } from "@/lib/translate";

/** Markdown/HTML → plain text, clamped | used for the header sinopse teaser. */
const toPreview = (text: string, max = 240) => {
  const plain = text
    .replace(/<[^>]+>/g, " ") // html tags
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1") // md links/images → label
    .replace(/[*_`~#>]/g, "") // md emphasis / headings
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > max ? `${plain.slice(0, max).trimEnd()}…` : plain;
};

type P = Promise<{ id: string; slug?: string[] }>;
type SP = Promise<{ n?: string }>;

/**
 * Name hint for the backend's id-fallback resolution. Prefers the legacy `?n=`
 * query (exact title) and falls back to de-slugifying the path tail, so clean
 * `/manga/{id}/{slug}` URLs keep the same resilience the old `?n=` links had.
 */
const nameHint = (slug: string[] | undefined, n: string | undefined): string | undefined =>
  n ?? (slug?.[0] ? deslugify(slug[0]) : undefined);

/** URL-friendly slug for the genre route | must round-trip with the backend's normGenre. */
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
  const [{ id, slug }, { n }] = await Promise.all([params, searchParams]);
  const name = nameHint(slug, n);
  let core: Awaited<ReturnType<typeof api.manga.core>>["core"] | undefined;
  try {
    core = (await api.manga.core({ id, name })).core;
  } catch {}

  const title = core?.title ?? name ?? "Mangá";
  // Keyword-rich title so the work ranks for "<título>" and "super manhwa <título>".
  const metaTitle = `${title} | Ler Online em Português`;
  const description = core?.description
    ? toPreview(await translatePt(core.description), 200)
    : `Leia ${title} online de graça, em português, com capítulos atualizados no Super Manhwa.`;
  // The cover is public (signed `?k=`), so it's safe as the share/OG image.
  const images = core?.imageUrl ? [core.imageUrl] : undefined;
  // Canonical fixes the duplicate URLs the old `?n=` query and slug-less paths created.
  const canonical = `/manga/${id}/${slugify(title)}`;
  // Every name the work is known by (official variants + machine pt-BR title), so
  // it surfaces for searches in Portuguese and any other language.
  const altTitles = await buildAltTitles(title, core?.aliases ?? []);

  return {
    title: metaTitle,
    description,
    keywords: [title, ...altTitles],
    alternates: { canonical },
    openGraph: { title: metaTitle, description, type: "book", url: canonical, images },
    twitter: { card: "summary_large_image", title: metaTitle, description, images },
  };
}

export default async function MangaPage({ params, searchParams }: { params: P; searchParams: SP }) {
  const [{ id, slug }, { n }] = await Promise.all([params, searchParams]);
  const name = nameHint(slug, n);

  // Fast half: work metadata (AniList, cached) | paints the hero immediately.
  let coreData: Awaited<ReturnType<typeof api.manga.core>> | undefined;
  let error: string | null = null;
  try {
    coreData = await api.manga.core({ id, name });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    // Read-side fallback: a downed source serves the last cached metadata.
    const cached = await getCachedWork(id);
    if (cached) {
      coreData = {
        core: { ...cached.core, title: cached.title },
        lang: "pt-br",
      } as typeof coreData;
      error = null;
    }
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
  const title = core.title ?? name ?? "Mangá";

  // Send slug-less or stale-slug visits (and old `?n=` links) to the canonical
  // path with a 308, so search engines consolidate on one keyword-rich URL.
  const canonicalSlug = slugify(title);
  if (slug?.[0] !== canonicalSlug) permanentRedirect(`/manga/${id}/${canonicalSlug}`);

  // Slow half: cross-source chapter fan-out | streamed, NOT awaited. The promise
  // is handed to the client components, which suspend behind skeletons while it
  // resolves. A failure degrades to an empty list so the page still renders.
  const chaptersPromise = api.manga.chapters({ id, name }).catch(() => ({ chapters: [], lang }));

  // Cache-on-read: persist metadata + cover (R2) now, and the merged chapters
  // once they resolve. Runs after the response is streamed, so it never delays
  // the page; all writes are best-effort and idempotent.
  after(async () => {
    await cacheWorkOnRead(id, core);
    const resolved = await chaptersPromise;
    await cacheChaptersOnRead(id, resolved.chapters);
  });

  // Characters are the heavy half of the metadata and only feed the "Personagens"
  // tab | streamed, NOT awaited, so they never hold up the hero.
  const charactersPromise = api.manga
    .characters({ name: title })
    // Translate each bio to pt-br (cached). Names/roles stay as-is; this streams
    // behind the Personagens tab's Suspense, so it never holds up the hero.
    .then((r) =>
      Promise.all(
        r.characters.map(async (c) =>
          c.description ? { ...c, description: await translatePt(c.description) } : c,
        ),
      ),
    )
    .catch(() => []);

  // Rich metadata (AniList) | best-effort, never blocks the page meaningfully.
  const { meta } = await api.manga.meta({ name: title }).catch(() => ({
    meta: { tags: [], relations: [] } as Awaited<ReturnType<typeof api.manga.meta>>["meta"],
  }));

  // Synopsis translated to pt-br once (server-side, cached) | reused by the
  // header teaser, the "Sobre" tab, the SEO metadata and the JSON-LD. Falls back
  // to the original text if the translation proxy fails.
  const rawDesc = core.description || meta.description || "";
  const desc = await translatePt(rawDesc);

  // Every name the work is known by (official variants + machine pt-BR title).
  // Rendered as real on-page text and fed to JSON-LD, so the obra is found
  // whether searched by its English, native, or Portuguese name.
  const altTitles = await buildAltTitles(title, core.aliases ?? []);

  const aboutTab = (
    <div className="about">
      {desc ? (
        <MarkdownDescription text={desc} />
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

      {altTitles.length > 0 && (
        <p className="alt-titles">
          <span className="muted">Também conhecido como:</span> {altTitles.join(" · ")}
        </p>
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
                <Link href={`/?q=${encodeURIComponent(r.title)}`} className="relation-link">
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );

  // Header sinopse teaser | plain text, since the full markdown lives in "Sobre".
  const descPreview = desc ? toPreview(desc) : undefined;

  // Structured data so search engines render a rich book result (cover, rating,
  // genres). Image/URL absolute via SITE_URL; relative paths confuse some crawlers.
  const base = env.SITE_URL ?? "http://localhost:3000";
  const canonicalUrl = `${base}/manga/${id}/${canonicalSlug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: title,
    ...(altTitles.length > 0 ? { alternateName: altTitles } : {}),
    url: canonicalUrl,
    ...(core.imageUrl ? { image: `${base}${core.imageUrl}` } : {}),
    ...(desc ? { description: toPreview(desc, 300) } : {}),
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
      { "@type": "ListItem", position: 2, name: title, item: canonicalUrl },
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
        charactersPromise={charactersPromise}
        about={aboutTab}
        comments={<Comments targetType="work" targetId={id} />}
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
