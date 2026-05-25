import { useState } from 'react';
import { getRouteApi, Link } from '@tanstack/react-router';
import { chapterSlug } from '../api';

const route = getRouteApi('/manga/$slug');

export default function ChaptersPage() {
  const { slug } = route.useParams();
  const { title } = route.useSearch();
  const chapters = route.useLoaderData();

  const [filter, setFilter] = useState('');
  const heading = title || slug.replace(/-/g, ' ');

  const f = filter.trim().toLowerCase();
  const shown = f ? chapters.filter((c) => c.title.toLowerCase().includes(f)) : chapters;

  return (
    <>
      <Link to="/" search={{ q: '' }} className="back">← Voltar à busca</Link>
      <h2 style={{ margin: '0 0 4px', textTransform: 'capitalize' }}>{heading}</h2>

      <div className="row" style={{ margin: '12px 0 4px' }}>
        <input
          className="field"
          style={{ flex: 1, minWidth: 180 }}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar capítulos…"
        />
        <span className="muted">{shown.length} de {chapters.length}</span>
      </div>

      <ul className="chapters-grid">
        {shown.map((c) => (
          <li key={c.url}>
            <Link
              className="chip"
              to="/manga/$slug/$chapter"
              params={{ slug, chapter: chapterSlug(c.url) }}
              search={{ title: c.title }}
            >
              {c.title}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
