import Link from "next/link";
import { api } from "@/lib/orpc.server";
import { imageSrc } from "@/lib/image";
import { SearchControls } from "@/components/SearchControls";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const { sources } = await api.sources.list({});
  const source = sp.source || sources[0]?.id || "";
  const q = (sp.q ?? "").trim();

  let result: Awaited<ReturnType<typeof api.manga.popular>> | undefined;
  let error: string | null = null;
  try {
    result = q
      ? await api.manga.search({ source, q, page: 1 })
      : await api.manga.popular({ source, page: 1 });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return (
    <>
      <SearchControls sources={sources} source={source} q={q} />

      {result && (
        <p className="muted">
          {q ? `Resultados de “${q}” · ` : "Populares · "}
          <span className="src-pill">fonte: {result.source.name}</span>
        </p>
      )}
      {error && <p className="notice">{error}</p>}

      {result && (
        <div className="poster-grid">
          {result.list.map((m, i) => (
            <Link
              key={m.link + i}
              className="poster"
              href={`/manga?source=${source}&url=${encodeURIComponent(m.link)}&title=${encodeURIComponent(m.name)}`}
            >
              <div className="poster-cover">
                {m.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy" src={imageSrc(source, m.imageUrl)} alt={m.name} />
                ) : (
                  <div className="poster-noimg">sem capa</div>
                )}
                <span className="poster-src">{result.source.name}</span>
              </div>
              <div className="poster-name">{m.name}</div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
