import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Pagination } from "@/components/Pagination";
import { PosterGrid } from "@/components/PosterGrid";
import { api } from "@/lib/orpc.server";

export const dynamic = "force-dynamic";

type P = Promise<{ genre: string }>;
type SP = Promise<{ page?: string }>;

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

export default async function GenrePage({ params, searchParams }: { params: P; searchParams: SP }) {
  const { genre } = await params;
  const { page: pageParam } = await searchParams;
  const label = prettify(genre);
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  // pt-br pinned to match the rest of the frontend.
  const result = await api.manga.popular({ lang: "pt-br", genre, page }).catch((e) => ({
    list: [] as Awaited<ReturnType<typeof api.manga.popular>>["list"],
    hasNextPage: false,
    _error: e instanceof Error ? e.message : String(e),
  }));
  const error = "_error" in result ? result._error : null;

  const buildHref = (p: number) => (p > 1 ? `/g/${genre}?page=${p}` : `/g/${genre}`);

  return (
    <>
      <Link className="back" href="/">
        <Icon name="arrow-left" size={16} /> voltar
      </Link>
      <h1 className="detail-title" style={{ marginBottom: 4 }}>
        {label}
      </h1>
      <p className="muted">{page > 1 ? `página ${page}` : `${result.list.length} obras`}</p>
      {error && <p className="notice">{error}</p>}
      <PosterGrid items={result.list} />
      <Pagination page={page} hasNextPage={result.hasNextPage} buildHref={buildHref} />
    </>
  );
}
