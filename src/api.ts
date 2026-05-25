import type { Chapter, MangaResult, SearchResponse } from './types';

// ---- Cache em localStorage --------------------------------------------
// É o "via localStorage" do teste: cada termo de busca vira uma entrada
// com timestamp. Enquanto válida (TTL), respondemos do cache sem bater na API.
const CACHE_PREFIX = 'mb_search:';
const TTL_MS = 5 * 60 * 1000; // 5 minutos

interface CacheEntry {
  ts: number;
  data: MangaResult[];
}

function cacheKey(term: string): string {
  return CACHE_PREFIX + term.trim().toLowerCase();
}

export function readCache(term: string): MangaResult[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(term));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.ts > TTL_MS) {
      localStorage.removeItem(cacheKey(term));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function writeCache(term: string, data: MangaResult[]): void {
  const entry: CacheEntry = { ts: Date.now(), data };
  try {
    localStorage.setItem(cacheKey(term), JSON.stringify(entry));
  } catch {
    /* quota cheia: ignora silenciosamente */
  }
}

export function clearCache(): void {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(CACHE_PREFIX))
    .forEach((k) => localStorage.removeItem(k));
}

// ---- Chamada à API de busca -------------------------------------------
// POST /wp-admin/admin-ajax.php  (via proxy /api do Vite p/ evitar CORS)
// body: action=wp-manga-search-manga & title=<termo>
export interface SearchOutcome {
  results: MangaResult[];
  fromCache: boolean;
}

export async function searchManga(term: string): Promise<SearchOutcome> {
  const cached = readCache(term);
  if (cached) return { results: cached, fromCache: true };

  const body = new URLSearchParams({
    action: 'wp-manga-search-manga',
    title: term,
  });

  const res = await fetch('/api/wp-admin/admin-ajax.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body,
  });

  if (!res.ok) {
    // 429 aqui é justamente o sinal de rate limit que você quer observar.
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as SearchResponse;
  const results = json.success ? json.data : [];
  writeCache(term, results);
  return { results, fromCache: false };
}

// ---- Leitura de capítulos ---------------------------------------------
// As páginas do WordPress (mangasbrasuka.com.br) não mandam CORS, então
// passam pelo proxy /api do Vite. Já as imagens ficam no CDN
// cdn.mugiverso.com, que responde com `access-control-allow-origin: *`
// e sem exigir Referer — logo o browser as carrega/sonda direto.
export const SITE_ORIGIN = 'https://mangasbrasuka.com.br';

// Construtores de URL a partir dos slugs usados nas rotas.
export const mangaUrl = (slug: string) => `${SITE_ORIGIN}/manga/${slug}/`;
export const chapterUrl = (slug: string, chapter: string) =>
  `${SITE_ORIGIN}/manga/${slug}/${chapter}/`;

// .../manga/slug/capitulo-111/ -> "capitulo-111" (segmento usado na rota)
export const chapterSlug = (url: string) =>
  url.replace(/\/+$/, '').split('/').pop() ?? '';

// https://mangasbrasuka.com.br/manga/slug/ -> /api/manga/slug/
function toProxyPath(absUrl: string): string {
  return '/api' + absUrl.replace(SITE_ORIGIN, '');
}

// Cache em memória da sessão: navegar entre capítulos não rebusca a lista.
const chaptersCache = new Map<string, Chapter[]>();

// O tema Madara serve a lista de capítulos num endpoint próprio:
// POST <url-da-obra>/ajax/chapters/  ->  HTML com <a href=".../capitulo-N/">.
export async function fetchChapters(mangaUrl: string): Promise<Chapter[]> {
  const cached = chaptersCache.get(mangaUrl);
  if (cached) return cached;

  const url = toProxyPath(mangaUrl).replace(/\/?$/, '/') + 'ajax/chapters/';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ao listar capítulos`);
  const html = await res.text();

  const chapters: Chapter[] = [];
  const seen = new Set<string>();
  const re = /<a[^>]+href="([^"]*\/capitulo[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const url = m[1];
    if (seen.has(url)) continue;
    seen.add(url);
    const title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    chapters.push({ title: title || url, url });
  }
  chaptersCache.set(mangaUrl, chapters);
  return chapters;
}

// Reconstrói o nome de arquivo das páginas a partir do 1º arquivo observado.
// Cada bloco de dígitos vira uma variável (zero-padded na largura original):
//   "001__001.jpg" -> 2 vars (página, fatia)   [esquema fatiado]
//   "01.webp"      -> 1 var  (página)           [esquema plano]
interface NameTemplate {
  vars: number; // 1 = plano, 2 = fatiado
  render: (nums: number[]) => string; // só o nome do arquivo
}

function buildTemplate(file: string): NameTemplate {
  const lits: string[] = [];
  const widths: number[] = [];
  const re = /\d+/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(file))) {
    lits.push(file.slice(last, m.index));
    widths.push(m[0].length);
    last = m.index + m[0].length;
  }
  lits.push(file.slice(last)); // sufixo + extensão
  const pad = (n: number, w: number) => String(n).padStart(w, '0');
  return {
    vars: widths.length,
    render: (nums) =>
      lits.reduce((acc, lit, i) => acc + lit + (i < widths.length ? pad(nums[i], widths[i]) : ''), ''),
  };
}

// Sonda a existência via <img>, NÃO via fetch. Motivo: o CDN tem
// `vary: Origin` e, num request CORS (fetch), o Cloudflare devolve o header
// duplicado `Access-Control-Allow-Origin: <origin>, *` — inválido, o browser
// bloqueia. Já o carregamento de <img> cross-origin não dispara CORS (não
// manda Origin), então funciona — e a imagem baixada fica em cache p/ render.
function imageOk(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

// Sonda um eixo a partir de 1 até o primeiro 404, em lotes paralelos.
async function probeAxis(exists: (n: number) => Promise<boolean>, batch = 8, cap = 600): Promise<number> {
  let count = 0;
  while (count < cap) {
    const idx = Array.from({ length: batch }, (_, i) => count + i + 1);
    const res = await Promise.all(idx.map(exists));
    const gap = res.indexOf(false);
    if (gap === -1) count += batch;
    else return count + gap;
  }
  return count;
}

// Monta a lista ordenada de URLs de imagem de um capítulo.
// 1) busca o HTML do capítulo (via proxy) e extrai a 1ª URL do CDN — ela vem
//    em texto claro no href do anúncio (param t=...);
// 2) detecta o template do nome e enumera páginas (e fatias) sondando o CDN.
export async function fetchChapterImages(chapterUrl: string): Promise<string[]> {
  const res = await fetch(toProxyPath(chapterUrl));
  if (!res.ok) throw new Error(`HTTP ${res.status} ao abrir capítulo`);
  const html = await res.text();

  // Especificamente a imagem do capítulo: .../manga_<id>/<hash>/<arquivo>
  // (ignora logos/uploads que também moram no mesmo CDN).
  const cdn = html.match(
    /https?:\/\/cdn\.mugiverso\.com\/[a-z0-9_\-./]*?manga_[0-9a-f]+\/[0-9a-f]+\/[a-z0-9_.\-]+/i,
  );
  if (!cdn) throw new Error('Não encontrei a imagem do capítulo no HTML');

  const firstUrl = cdn[0];
  const base = firstUrl.slice(0, firstUrl.lastIndexOf('/'));
  const file = firstUrl.slice(firstUrl.lastIndexOf('/') + 1);
  const tpl = buildTemplate(file);

  const urls: string[] = [];
  if (tpl.vars >= 2) {
    // Fatiado: cada página é dividida em N tiles verticais (NNN__SSS).
    const pages = await probeAxis((p) => imageOk(`${base}/${tpl.render([p, 1])}`));
    for (let p = 1; p <= pages; p++) {
      const slices = await probeAxis((s) => imageOk(`${base}/${tpl.render([p, s])}`));
      for (let s = 1; s <= slices; s++) urls.push(`${base}/${tpl.render([p, s])}`);
    }
  } else {
    // Plano: uma imagem por página (NN.ext).
    const pages = await probeAxis((p) => imageOk(`${base}/${tpl.render([p])}`));
    for (let p = 1; p <= pages; p++) urls.push(`${base}/${tpl.render([p])}`);
  }

  if (urls.length === 0) throw new Error('Nenhuma página encontrada no CDN');
  return urls;
}
