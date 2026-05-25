import { useEffect, useState } from 'react';
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { searchManga, clearCache } from '../api';
import type { MangaResult } from '../types';

const route = getRouteApi('/');

// .../manga/o-cavaleiro-em-eterna-regressao/ -> "o-cavaleiro-em-eterna-regressao"
const mangaSlug = (url: string) => url.replace(/\/+$/, '').split('/').pop() ?? '';

export default function SearchPage() {
  const { q } = route.useSearch();
  const navigate = useNavigate();

  const [term, setTerm] = useState(q);
  const [results, setResults] = useState<MangaResult[]>([]);
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A busca é dirigida pela URL: sempre que ?q= muda (submit, voltar, link
  // compartilhado), refazemos a consulta.
  useEffect(() => {
    setTerm(q);
    if (!q) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    searchManga(q)
      .then(({ results, fromCache }) => {
        if (cancelled) return;
        setResults(results);
        setFromCache(fromCache);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Falha na busca');
        setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: '/', search: { q: term.trim() } });
  }

  return (
    <>
      <p className="subtitle">Busque uma obra e leia os capítulos direto aqui.</p>

      <form onSubmit={onSubmit} className="row searchbar">
        <input
          className="field"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar manga… (ex.: cavaleiro)"
          autoFocus
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => clearCache()}>
          Limpar cache
        </button>
      </form>

      {loading && <div className="loading"><span className="spinner" /> Buscando…</div>}
      {error && <p className="notice">Erro: {error}</p>}

      {results.length > 0 && (
        <>
          <p className="muted">
            {fromCache ? '✓ cache (localStorage)' : '↓ API'} — {results.length} resultado(s)
          </p>
          <ul className="results">
            {results.map((r) => (
              <li key={r.url} className="card">
                <Link to="/manga/$slug" params={{ slug: mangaSlug(r.url) }} search={{ title: r.title }}>
                  {r.title}
                </Link>
                <span className="tag">{r.type}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {!loading && !error && q && results.length === 0 && (
        <p className="muted">Nenhum resultado para “{q}”.</p>
      )}
    </>
  );
}
