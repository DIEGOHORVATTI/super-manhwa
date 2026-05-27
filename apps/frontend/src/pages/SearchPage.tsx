import { useEffect, useState } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "../lib/orpc";
import { errorMessage } from "../lib/img";
import { SourcePicker } from "../components/SourcePicker";
import { MangaGrid } from "../components/MangaGrid";
import { SourceBadge } from "../components/SourceBadge";

const route = getRouteApi("/");

export default function SearchPage() {
  const { source, q } = route.useSearch();
  const navigate = useNavigate();
  const [term, setTerm] = useState(q);

  // Default to the first source when none is selected.
  const { data: srcData } = useQuery(orpc.sources.list.queryOptions({ input: {} }));
  useEffect(() => {
    if (!source && srcData?.sources[0]) {
      navigate({ to: "/", search: { source: srcData.sources[0].id, q: "" }, replace: true });
    }
  }, [source, srcData, navigate]);

  const isSearch = q.trim().length > 0;
  const popular = useQuery({
    ...orpc.manga.popular.queryOptions({ input: { source, page: 1 } }),
    enabled: !!source && !isSearch,
  });
  const search = useQuery({
    ...orpc.manga.search.queryOptions({ input: { source, q: q.trim(), page: 1 } }),
    enabled: !!source && isSearch,
  });

  const active = isSearch ? search : popular;
  const result = active.data;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/", search: { source, q: term.trim() } });
  };

  return (
    <>
      <div style={{ marginTop: 12 }}>
        <SourcePicker value={source} onChange={(id) => navigate({ to: "/", search: { source: id, q: "" } })} />
      </div>

      <form className="row searchbar" onSubmit={submit}>
        <input
          className="field"
          value={term}
          placeholder="Buscar… (vazio = populares)"
          onChange={(e) => setTerm(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">Buscar</button>
      </form>

      {result && (
        <p className="muted">
          {isSearch ? <>Resultados de “{q}” · </> : <>Populares · </>}
          <SourceBadge name={result.source.name} />
        </p>
      )}

      {active.error && <p className="notice">{errorMessage(active.error)}</p>}
      {active.isPending && !!source && <div className="loading"><span className="spinner" /> Carregando…</div>}

      {result && <MangaGrid list={result.list} source={source} sourceName={result.source.name} />}
    </>
  );
}
