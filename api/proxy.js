// Proxy /api/* -> https://mangasbrasuka.com.br/*
//
// O proxy do Vite so existe em dev e os rewrites EXTERNOS da Vercel nao
// preservam POST (caem no fallback de SPA -> 405/404). Esta funcao Node faz
// o proxy server-side preservando metodo, headers e body. Como a app fala
// com a mesma origem (/api), nao ha CORS.
//
// O caminho original chega em req.query.path via rewrite INTERNO no
// vercel.json (rewrites internos preservam metodo e corpo).

const ORIGIN = 'https://mangasbrasuka.com.br';

// Le o corpo cru sem tocar em req.body (que dispararia o parser da Vercel),
// mantendo o proxy agnostico ao content-type.
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(chunks.length ? Buffer.concat(chunks) : undefined));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  const raw = req.query?.path ?? '';
  const path = Array.isArray(raw) ? raw.join('/') : raw;
  const target = `${ORIGIN}/${path}`;

  // Repassa os headers do cliente, descartando os de hop/infra. Faz o request
  // parecer same-origin do WordPress (Origin/Referer do site) p/ evitar
  // bloqueios de anti-bot/hotlink. Remove accept-encoding p/ receber o corpo
  // ja descomprimido e repassar sem mismatch de content-encoding.
  const skip = new Set([
    'host', 'connection', 'content-length', 'accept-encoding',
    'x-forwarded-host', 'x-forwarded-proto', 'x-forwarded-for',
    'x-vercel-id', 'x-vercel-deployment-url', 'forwarded',
  ]);
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (v != null && !skip.has(k.toLowerCase())) headers[k] = v;
  }
  headers['origin'] = ORIGIN;
  headers['referer'] = `${ORIGIN}/`;

  const init = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const body = await readRawBody(req);
    if (body) init.body = body;
  }

  const upstream = await fetch(target, init);

  res.status(upstream.status);
  const ct = upstream.headers.get('content-type');
  if (ct) res.setHeader('content-type', ct);
  res.setHeader('cache-control', 'public, max-age=0, must-revalidate');

  const buf = Buffer.from(await upstream.arrayBuffer());
  res.send(buf);
}
