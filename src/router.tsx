import { createRootRoute, createRoute, createRouter, Link, Outlet } from '@tanstack/react-router';
import { fetchChapters, fetchChapterImages, mangaUrl, chapterUrl } from './api';
import SearchPage from './pages/SearchPage';
import ChaptersPage from './pages/ChaptersPage';
import ReaderPage from './pages/ReaderPage';

// Layout comum: título clicável (volta pra home) + <Outlet/> das rotas.
const rootRoute = createRootRoute({
  component: () => (
    <main className="app">
      <Link to="/" search={{ q: '' }} className="brand" style={{ color: 'inherit' }}>
        <h1>MangaReader<span className="dot">.</span></h1>
      </Link>
      <Outlet />
    </main>
  ),
});

// /  — busca (o termo vive na URL em ?q=, então é compartilhável).
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s.q === 'string' ? s.q : '' }),
  component: SearchPage,
});

const errorComponent = ({ error }: { error: Error }) => (
  <p className="notice">Erro: {error.message}</p>
);

// /manga/$slug  — lista de capítulos (carregada via loader).
const chaptersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'manga/$slug',
  validateSearch: (s: Record<string, unknown>) => ({ title: typeof s.title === 'string' ? s.title : '' }),
  loader: ({ params: { slug } }) => fetchChapters(mangaUrl(slug)),
  pendingComponent: () => (
    <div className="loading"><span className="spinner" /> Carregando capítulos…</div>
  ),
  errorComponent,
  component: ChaptersPage,
});

// /manga/$slug/$chapter  — leitor (loader monta a lista de páginas no CDN).
const readerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'manga/$slug/$chapter',
  validateSearch: (s: Record<string, unknown>) => ({ title: typeof s.title === 'string' ? s.title : '' }),
  loader: async ({ params: { slug, chapter } }) => {
    const [pages, chapters] = await Promise.all([
      fetchChapterImages(chapterUrl(slug, chapter)),
      fetchChapters(mangaUrl(slug)),
    ]);
    return { pages, chapters };
  },
  pendingComponent: () => (
    <div className="loading"><span className="spinner" /> Montando páginas (sondando o CDN)…</div>
  ),
  errorComponent,
  component: ReaderPage,
});

const routeTree = rootRoute.addChildren([indexRoute, chaptersRoute, readerRoute]);

export const router = createRouter({ routeTree, defaultPendingMs: 150 });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
