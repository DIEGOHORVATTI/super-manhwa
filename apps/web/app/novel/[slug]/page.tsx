import type { Metadata } from "next";

import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";

import { Comments } from "@/components/Comments";
import { ChapterList } from "@/components/novel/ChapterList";
import { FavoriteToggle } from "@/components/novel/FavoriteToggle";
import { NovelCover } from "@/components/novel/NovelCover";
import { StartReadingButton } from "@/components/novel/StartReadingButton";
import { getChapters, getNovel } from "@/lib/catalog";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";

type NovelPageProps = {
  params: Promise<{ slug: string }>;
};

const STATUS_LABEL = { ongoing: "Em andamento", completed: "Completa", hiatus: "Em hiato" };

const teaser = (text = "", max = 200) =>
  text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;

export async function generateMetadata({ params }: NovelPageProps): Promise<Metadata> {
  const { slug } = await params;
  const novel = await getNovel(slug).catch(() => null);
  if (!novel) return { title: "Novel não encontrada" };

  const title = `${novel.title} | Ler e ouvir em português`;
  const description =
    teaser(novel.synopsis) || `Leia ou ouça ${novel.title} em português no Super Manhwa.`;
  const images = novel.cover ? [novel.cover] : undefined;

  return {
    title,
    description,
    keywords: [novel.title, ...novel.altTitles],
    alternates: { canonical: routes.novel(slug) },
    openGraph: { title, description, type: "book", images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

export default async function NovelPage({ params }: NovelPageProps) {
  const { slug } = await params;
  const [novel, chapters] = await Promise.all([
    getNovel(slug).catch(() => null),
    getChapters(slug).catch(() => []),
  ]);
  if (!novel) notFound();

  const base = env.SITE_URL ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: novel.title,
    url: `${base}${routes.novel(slug)}`,
    ...(novel.altTitles.length ? { alternateName: novel.altTitles } : {}),
    ...(novel.cover ? { image: novel.cover } : {}),
    ...(novel.synopsis ? { description: teaser(novel.synopsis, 300) } : {}),
    ...(novel.author ? { author: { "@type": "Person", name: novel.author } } : {}),
    genre: novel.genres.map((genre) => genre.name),
  };

  return (
    <Stack spacing={4}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={4} alignItems={{ sm: "flex-start" }}>
        <NovelCover
          src={novel.cover}
          title={novel.title}
          sx={{ width: { xs: 180, sm: 220 }, flexShrink: 0, boxShadow: 12 }}
        />

        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <Stack spacing={0.5}>
            <Typography variant="h3" component="h1">
              {novel.title}
            </Typography>
            {novel.altTitles.length > 0 && (
              <Typography
                color="text.secondary"
                sx={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {novel.altTitles.join(" · ")}
              </Typography>
            )}
          </Stack>

          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
            {novel.status && (
              <Chip
                label={STATUS_LABEL[novel.status]}
                color={novel.status === "completed" ? "success" : "info"}
                variant="soft"
                size="small"
              />
            )}
            {novel.types.map((type) => (
              <Chip key={type} label={type} variant="outlined" size="small" />
            ))}
            {novel.year && <Chip label={novel.year} variant="outlined" size="small" />}
            <Chip label={`${chapters.length} capítulos`} variant="outlined" size="small" />
          </Stack>

          {novel.author && (
            <Typography variant="body2" color="text.secondary">
              Autor: {novel.author}
            </Typography>
          )}

          <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: "wrap" }}>
            <StartReadingButton novelSlug={slug} firstChapterSlug={chapters.at(-1)?.slug} />
            <FavoriteToggle slug={slug} title={novel.title} cover={novel.cover} />
          </Stack>

          {novel.synopsis && (
            <Typography sx={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>
              {novel.synopsis}
            </Typography>
          )}

          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
            {novel.genres.map((genre) => (
              <Chip
                key={genre.slug}
                label={genre.name}
                component="a"
                href={routes.genre(genre.slug)}
                clickable
                size="small"
              />
            ))}
          </Stack>
        </Stack>
      </Stack>

      {chapters.length > 0 ? (
        <ChapterList novelSlug={slug} novelTitle={novel.title} chapters={chapters} />
      ) : (
        <Typography color="text.secondary">Nenhum capítulo publicado ainda.</Typography>
      )}

      <Comments targetType="work" targetId={slug} />
    </Stack>
  );
}
