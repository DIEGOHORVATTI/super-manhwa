import type { Metadata } from "next";

import { BrowseView } from "@/components/novel/BrowseView";
import { getGenres } from "@/lib/catalog";
import { parseBrowseState } from "@/lib/catalog/browse-state";
import { routes } from "@/lib/routes";

type GenrePageProps = {
  params: Promise<{ genre: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function genreName(slug: string) {
  const genres = await getGenres().catch(() => []);
  return genres.find((genre) => genre.slug === slug)?.name ?? decodeURIComponent(slug);
}

export async function generateMetadata({ params }: GenrePageProps): Promise<Metadata> {
  const { genre } = await params;
  const name = await genreName(genre);
  return {
    title: `Novels de ${name}`,
    description: `Light novels e web novels de ${name} em português para ler e ouvir.`,
    alternates: { canonical: routes.genre(genre) },
  };
}

export default async function GenrePage({ params, searchParams }: GenrePageProps) {
  const [{ genre }, rawParams] = await Promise.all([params, searchParams]);
  const state = { ...parseBrowseState(rawParams), genre };

  return <BrowseView state={state} title={`Novels de ${await genreName(genre)}`} />;
}
