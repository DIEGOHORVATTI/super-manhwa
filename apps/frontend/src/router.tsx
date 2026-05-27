import { createRootRoute, createRoute, createRouter, Link, Outlet } from "@tanstack/react-router";
import SearchPage from "./pages/SearchPage";
import DetailPage from "./pages/DetailPage";
import ReaderPage from "./pages/ReaderPage";

const rootRoute = createRootRoute({
  component: () => (
    <main className="app">
      <Link to="/" search={{ source: "", q: "" }} className="brand" style={{ color: "inherit" }}>
        <h1>MangaVerse<span className="dot">.</span></h1>
      </Link>
      <p className="subtitle">Leitor web · extensões Mangayomi num runtime TypeScript (oRPC end-to-end)</p>
      <Outlet />
    </main>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: (s: Record<string, unknown>) => ({
    source: typeof s.source === "string" ? s.source : "",
    q: typeof s.q === "string" ? s.q : "",
  }),
  component: SearchPage,
});

const mangaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "manga",
  validateSearch: (s: Record<string, unknown>) => ({
    source: String(s.source ?? ""),
    url: String(s.url ?? ""),
    title: typeof s.title === "string" ? s.title : "",
  }),
  component: DetailPage,
});

const readRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "read",
  validateSearch: (s: Record<string, unknown>) => ({
    source: String(s.source ?? ""),
    url: String(s.url ?? ""),
    title: typeof s.title === "string" ? s.title : "",
  }),
  component: ReaderPage,
});

const routeTree = rootRoute.addChildren([indexRoute, mangaRoute, readRoute]);

export const router = createRouter({ routeTree, defaultPendingMs: 150 });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
