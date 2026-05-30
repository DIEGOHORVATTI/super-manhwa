import type { Metadata } from "next";
import { Pagination } from "@/components/Pagination";
import { PosterGrid } from "@/components/PosterGrid";
import { api } from "@/lib/orpc.server";

export const metadata: Metadata = {
  title: "Atualizações recentes",
  description: "Obras com capítulos lançados recentemente nas fontes de leitura.",
};

type SP = Promise<{ page?: string }>;

/**
 * Recently-updated works, sourced from the reading connectors (not AniList).
 * Items carry opaque connector ids + a title hint, so the detail link resolves
 * by name.
 */
export default async function AtualizacoesPage({ searchParams }: { searchParams: SP }) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const result = await api.manga
    .latest({ lang: "pt-br", page })
    .catch(() => ({ list: [], hasNextPage: false }));

  const buildHref = (p: number) => (p > 1 ? `/atualizacoes?page=${p}` : "/atualizacoes");

  return (
    <>
      <h1 className="home-title" style={{ marginBottom: 12 }}>
        Atualizações recentes
      </h1>

      {result.list.length === 0 ? (
        <p className="muted">Nada por aqui agora — tente de novo em instantes.</p>
      ) : (
        <>
          <PosterGrid items={result.list} />
          <Pagination page={page} hasNextPage={result.hasNextPage} buildHref={buildHref} />
        </>
      )}
    </>
  );
}
