import { getRouteApi, Link } from '@tanstack/react-router';

const route = getRouteApi('/manga/$slug/$chapter');

export default function ReaderPage() {
  const { slug } = route.useParams();
  const { title } = route.useSearch();
  const pages = route.useLoaderData();

  return (
    <>
      <Link to="/manga/$slug" params={{ slug }} search={{ title: '' }}>← Capítulos</Link>
      <h2 style={{ marginTop: 12 }}>{title || 'Leitor'}</h2>
      <p style={{ fontSize: 13, color: '#666' }}>{pages.length} imagem(ns)</p>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#111' }}>
        {pages.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`página ${i + 1}`}
            loading="lazy"
            style={{ display: 'block', width: '100%', maxWidth: 760, height: 'auto' }}
          />
        ))}
      </div>
    </>
  );
}
