import { getRouteApi, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/orpc";
import { img, statusLabel, errorMessage } from "../lib/img";
import { SourceBadge } from "../components/SourceBadge";

const route = getRouteApi("/manga");

export default function DetailPage() {
  const { source, url, title } = route.useSearch();
  const { data, isPending, error } = useQuery(orpc.manga.detail.queryOptions({ input: { source, url } }));

  if (isPending) return <div className="loading"><span className="spinner" /> Carregando detalhes…</div>;
  if (error) return <p className="notice">{errorMessage(error)}</p>;

  const { source: src, detail } = data;
  const chapters = detail.chapters ?? [];

  return (
    <>
      <Link className="back" to="/" search={{ source, q: "" }}>← voltar</Link>

      <div className="detail-head">
        {detail.imageUrl && <img className="detail-cover" src={img(source, detail.imageUrl)} alt={title} />}
        <div className="detail-meta">
          <h2 className="detail-title">{detail.title || title}</h2>
          <SourceBadge name={src.name} />
          {detail.author && <p className="muted">por {detail.author}</p>}
          <p className="muted">{statusLabel(detail.status)} · {chapters.length} capítulos</p>
          {detail.genre && detail.genre.length > 0 && (
            <div className="genres">{detail.genre.slice(0, 12).map((g) => <span key={g} className="tag">{g}</span>)}</div>
          )}
        </div>
      </div>

      {detail.description && <p className="detail-desc">{detail.description}</p>}

      <h3 className="section">Capítulos</h3>
      {chapters.length === 0 && <p className="muted">Nenhum capítulo disponível nesta fonte.</p>}
      <ul className="chapters-grid">
        {chapters.map((c, i) => (
          <li key={c.url + i}>
            <Link className="chip" to="/read" search={{ source, url: c.url, title: c.name }}>{c.name}</Link>
          </li>
        ))}
      </ul>
    </>
  );
}
