import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { PosterGrid } from "@/components/PosterGrid";
import { api } from "@/lib/orpc.server";

export const dynamic = "force-dynamic";

type P = Promise<{ genre: string }>;

const prettify = (slug: string) =>
  decodeURIComponent(slug)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const { genre } = await params;
  const name = prettify(genre);
  return {
    title: `${name} — Super Manhwa`,
    description: `Obras do gênero ${name} em português.`,
  };
}

export default async function GenrePage({ params }: { params: P }) {
  const { genre } = await params;
  const label = prettify(genre);

  // pt-br pinned to match the rest of the frontend.
  const result = await api.manga.popular({ lang: "pt-br", genre, page: 1 }).catch((e) => ({
    list: [] as Awaited<ReturnType<typeof api.manga.popular>>["list"],
    hasNextPage: false,
    _error: e instanceof Error ? e.message : String(e),
  }));
  const error = "_error" in result ? result._error : null;

  return (
    <>
      <Link className="back" href="/">
        <Icon name="arrow-left" size={16} /> voltar
      </Link>
      <h1 className="detail-title" style={{ marginBottom: 4 }}>
        {label}
      </h1>
      <p className="muted">{result.list.length} obras</p>
      {error && <p className="notice">{error}</p>}
      <PosterGrid items={result.list} />
    </>
  );
}
