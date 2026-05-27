import { getRouteApi, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/orpc";
import { img, errorMessage } from "../lib/img";
import { SourceBadge } from "../components/SourceBadge";

const route = getRouteApi("/read");

export default function ReaderPage() {
  const { source, url, title } = route.useSearch();
  const { data, isPending, error } = useQuery(orpc.manga.pages.queryOptions({ input: { source, url } }));

  if (isPending) return <div className="loading"><span className="spinner" /> Carregando páginas…</div>;
  if (error) return <p className="notice">{errorMessage(error)}</p>;

  const { source: src, pages } = data;

  return (
    <>
      <div className="reader-nav">
        <Link className="btn btn-ghost" to="/" search={{ source, q: "" }}>← início</Link>
        <span className="muted" style={{ flex: 1 }}>
          {title} · <SourceBadge name={src.name} /> · {pages.length} págs
        </span>
      </div>

      <div className="pages">
        {pages.map((p, i) => (
          <img key={i} className="page-img" loading="lazy" src={img(source, p)} alt={`página ${i + 1}`} />
        ))}
      </div>

      {pages.length === 0 && <p className="muted">Nenhuma página retornada por esta fonte.</p>}
    </>
  );
}
