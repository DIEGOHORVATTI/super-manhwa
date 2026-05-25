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
      <p style={{ color: '#666', fontSize: 14 }}>
        Cliente da API <code>wp-manga-search-manga</code> com cache em localStorage (TTL 5 min).
      </p>

      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Digite um termo (ex.: cavaleiro)"
          style={{ flex: 1, padding: 8, fontSize: 16 }}
        />
        <button type="submit" disabled={loading} style={{ padding: '8px 16px' }}>
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
        <button type="button" onClick={() => clearCache()} style={{ padding: '8px 12px' }}>
          Limpar cache
        </button>
      </form>

      {error && <p style={{ color: '#c00' }}>Erro: {error}</p>}

      {results.length > 0 && (
        <>
          <p style={{ fontSize: 13, color: fromCache ? '#0a0' : '#06c' }}>
            {fromCache ? '✓ servido do cache (localStorage)' : '↓ buscado da API'} — {results.length} resultado(s)
          </p>
          <ul style={{ lineHeight: 1.8, listStyle: 'none', padding: 0 }}>
            {results.map((r) => (
              <li key={r.url}>
                <Link
                  to="/manga/$slug"
                  params={{ slug: mangaSlug(r.url) }}
                  search={{ title: r.title }}
                  style={{ color: '#06c' }}
                >
                  {r.title}
                </Link>{' '}
                <small style={{ color: '#999' }}>({r.type})</small>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
