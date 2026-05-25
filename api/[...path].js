// Proxy de borda: repassa /api/* -> https://mangasbrasuka.com.br/*
// preservando metodo, headers e body. Substitui o proxy do Vite (que so
// existe em dev) e os rewrites externos da Vercel (que nao preservam POST,
// caindo no fallback de SPA -> index.html -> 405 Method Not Allowed).
//
// Como roda server-side e a app fala com a mesma origem (/api), nao ha CORS.

export const config = { runtime: 'edge' };

const ORIGIN = 'https://mangasbrasuka.com.br';

export default async function handler(req) {
  const url = new URL(req.url);
  const targetPath = url.pathname.replace(/^\/api/, '');
  const target = ORIGIN + targetPath + url.search;

  // Repassa os headers do cliente, mas:
  // - remove host/x-forwarded-* (o fetch define o Host correto do destino);
  // - faz o request parecer same-origin do WordPress (Origin/Referer do site),
  //   evitando bloqueios de anti-bot/hotlink.
  const headers = new Headers(req.headers);
  headers.delete('host');
  headers.delete('x-forwarded-host');
  headers.delete('x-forwarded-proto');
  headers.delete('x-forwarded-for');
  headers.set('origin', ORIGIN);
  headers.set('referer', ORIGIN + '/');

  const init = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  const upstream = await fetch(target, init);

  // Repassa apenas o necessario. content-encoding NAO e repassado: o runtime
  // de borda ja entrega o corpo descomprimido.
  const respHeaders = new Headers();
  const ct = upstream.headers.get('content-type');
  if (ct) respHeaders.set('content-type', ct);
  respHeaders.set('cache-control', 'public, max-age=0, must-revalidate');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
}
