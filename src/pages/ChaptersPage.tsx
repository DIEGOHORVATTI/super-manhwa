import { getRouteApi, Link } from '@tanstack/react-router';
import { chapterSlug } from '../api';

const route = getRouteApi('/manga/$slug');

export default function ChaptersPage() {
  const { slug } = route.useParams();
  const { title } = route.useSearch();
  const chapters = route.useLoaderData();

  const heading = title || slug.replace(/-/g, ' ');

  return (
    <>
      <Link to="/" search={{ q: '' }}>← Voltar à busca</Link>
      <h2 style={{ marginTop: 12 }}>{heading}</h2>
      <p style={{ fontSize: 13, color: '#666' }}>{chapters.length} capítulo(s)</p>
      <ul style={{ lineHeight: 1.8, listStyle: 'none', padding: 0, maxHeight: '70vh', overflow: 'auto' }}>
        {chapters.map((c) => (
          <li key={c.url}>
            <Link
              to="/manga/$slug/$chapter"
              params={{ slug, chapter: chapterSlug(c.url) }}
              search={{ title: c.title }}
              style={{ color: '#06c' }}
            >
              {c.title}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
