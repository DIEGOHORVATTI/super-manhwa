import { useEffect, useState } from 'react';
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router';
import { chapterSlug } from '../api';
import type { Chapter } from '../types';

const route = getRouteApi('/manga/$slug/$chapter');

export default function ReaderPage() {
  const { slug, chapter } = route.useParams();
  // defaults: rede de segurança contra dados de loader desatualizados no HMR.
  const { pages = [], chapters = [] } = route.useLoaderData() ?? {};
  const navigate = useNavigate();

  // chapters vem em ordem decrescente (mais novo primeiro):
  //   idx-1 = próximo (número maior) | idx+1 = anterior (número menor)
  const idx = chapters.findIndex((c) => chapterSlug(c.url) === chapter);
  const next = idx > 0 ? chapters[idx - 1] : undefined;
  const prev = idx >= 0 && idx < chapters.length - 1 ? chapters[idx + 1] : undefined;
  const current = idx >= 0 ? chapters[idx] : undefined;

  const go = (c?: Chapter) => {
    if (!c) return;
    navigate({ to: '/manga/$slug/$chapter', params: { slug, chapter: chapterSlug(c.url) }, search: { title: c.title } });
  };

  // Setas do teclado trocam de capítulo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'ArrowLeft') go(prev);
      if (e.key === 'ArrowRight') go(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Ao trocar de capítulo, volta ao topo.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [chapter]);

  // Botão flutuante "voltar ao topo".
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const Nav = ({ bottom }: { bottom?: boolean }) => (
    <nav className={`reader-nav${bottom ? ' bottom' : ''}`}>
      <Link className="btn btn-ghost" to="/manga/$slug" params={{ slug }} search={{ title: '' }}>
        ☰ Capítulos
      </Link>
      <button className="btn" onClick={() => go(prev)} disabled={!prev} title="Capítulo anterior (←)">
        ‹ Anterior
      </button>
      <select
        className="select"
        value={chapter}
        onChange={(e) => go(chapters.find((c) => chapterSlug(c.url) === e.target.value))}
      >
        {chapters.map((c) => (
          <option key={c.url} value={chapterSlug(c.url)}>
            {c.title}
          </option>
        ))}
      </select>
      <button className="btn" onClick={() => go(next)} disabled={!next} title="Próximo capítulo (→)">
        Próximo ›
      </button>
    </nav>
  );

  return (
    <>
      <Nav />
      <p className="muted" style={{ margin: '0 0 10px' }}>
        {current?.title ?? 'Capítulo'} — {pages.length} página(s)
      </p>

      <div className="pages">
        {pages.map((src, i) => (
          <img key={src} className="page-img" src={src} alt={`página ${i + 1}`} loading="lazy" />
        ))}
      </div>

      <Nav bottom />

      {showTop && (
        <button className="fab" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title="Voltar ao topo">
          ↑
        </button>
      )}
    </>
  );
}
