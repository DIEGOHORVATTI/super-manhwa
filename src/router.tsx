import { createRootRoute, createRoute, createRouter, Link, Outlet } from '@tanstack/react-router';
import { fetchChapters, fetchChapterImages, mangaUrl, chapterUrl } from './api';
import SearchPage from './pages/SearchPage';
import ChaptersPage from './pages/ChaptersPage';
import ReaderPage from './pages/ReaderPage';

// Layout comum: título clicável (volta pra home) + <Outlet/> das rotas.
const rootRoute = createRootRoute({
  component: () => (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 760, margin: '40px auto', padding: 16 }}>
      <Link to="/" search={{ q: '' }} style={{ textDecoration: 'none', color: 'inherit' }}>
        <h1 style={{ margin: '0 0 16px' }}>Busca de obras</h1>
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
  <p style={{ color: '#c00' }}>Erro: {error.message}</p>
);

// /manga/$slug  — lista de capítulos (carregada via loader).
const chaptersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'manga/$slug',
  validateSearch: (s: Record<string, unknown>) => ({ title: typeof s.title === 'string' ? s.title : '' }),
  loader: ({ params: { slug } }) => fetchChapters(mangaUrl(slug)),
  pendingComponent: () => <p>Carregando capítulos…</p>,
  errorComponent,
  component: ChaptersPage,
});

// /manga/$slug/$chapter  — leitor (loader monta a lista de páginas no CDN).
const readerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'manga/$slug/$chapter',
  validateSearch: (s: Record<string, unknown>) => ({ title: typeof s.title === 'string' ? s.title : '' }),
  loader: ({ params: { slug, chapter } }) => fetchChapterImages(chapterUrl(slug, chapter)),
  pendingComponent: () => <p>Montando páginas (sondando o CDN)…</p>,
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
