/**
 * Repository loader (ADR-0001). Two tiers:
 *  - CURATED: a hand-picked, validated set (featured in the UI, stable raw URLs).
 *  - DYNAMIC: every JS manga source from the upstream index.json (114+), resolved
 *    on demand by id. No per-plugin work — the runtime is generic.
 * Source CODE is fetched lazily and cached in module scope (warm across Vercel
 * invocations under Fluid Compute — ADR-0007).
 */

const RAW =
  "https://raw.githubusercontent.com/kodjodevf/mangayomi-extensions/main/javascript/manga/src/";
const INDEX_URL =
  "https://raw.githubusercontent.com/kodjodevf/mangayomi-extensions/main/index.json";

export interface SourceInfo {
  id: string;
  name: string;
  lang: string;
  hasCloudflare: boolean;
  isNsfw: boolean;
  iconUrl: string;
  baseUrl: string;
  codeUrl: string;
  featured?: boolean;
}

export type PublicSource = Omit<SourceInfo, "codeUrl">;

/** Curated, validated sources (pinned/featured in the UI). */
export const CURATED: SourceInfo[] = [
  { id: "mangadex", name: "MangaDex", lang: "en", hasCloudflare: false, isNsfw: false, featured: true, baseUrl: "https://mangadex.org", iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=mangadex.org", codeUrl: RAW + "all/mangadex.js" },
  { id: "webtoons", name: "Webtoons", lang: "en", hasCloudflare: false, isNsfw: false, featured: true, baseUrl: "https://www.webtoons.com", iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=webtoons.com", codeUrl: RAW + "all/webtoons.js" },
  { id: "weebcentral", name: "Weeb Central", lang: "en", hasCloudflare: false, isNsfw: false, featured: true, baseUrl: "https://weebcentral.com", iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=weebcentral.com", codeUrl: RAW + "en/weebcentral.js" },
  { id: "mangaworld", name: "MangaWorld", lang: "it", hasCloudflare: false, isNsfw: false, featured: true, baseUrl: "https://www.mangaworld.cx", iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=mangaworld.cx", codeUrl: RAW + "it/mangaworld.js" },
  { id: "manhwaz", name: "Manhwaz", lang: "en", hasCloudflare: false, isNsfw: false, featured: true, baseUrl: "https://manhwaz.com", iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=manhwaz.com", codeUrl: RAW + "en/manhwaz.js" },
  { id: "asurascans", name: "Asura Scans", lang: "en", hasCloudflare: true, isNsfw: false, featured: true, baseUrl: "https://asuracomic.net", iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=asuracomic.net", codeUrl: RAW + "en/asurascans.js" },
];

const curatedById = new Map(CURATED.map((s) => [s.id, s]));

let indexPromise: Promise<Map<string, SourceInfo>> | undefined;

async function loadIndex(): Promise<Map<string, SourceInfo>> {
  indexPromise ??= (async () => {
    const res = await fetch(INDEX_URL);
    if (!res.ok) throw new Error(`Failed to fetch index.json (${res.status})`);
    const all = (await res.json()) as Array<Record<string, unknown>>;
    const map = new Map<string, SourceInfo>();
    for (const e of all) {
      if (e.sourceCodeLanguage !== 1 || e.itemType !== 0) continue; // JS manga only
      const id = "id-" + String(e.id);
      map.set(id, {
        id,
        name: String(e.name),
        lang: String(e.lang ?? ""),
        hasCloudflare: Boolean(e.hasCloudflare),
        isNsfw: Boolean(e.isNsfw),
        iconUrl: String(e.iconUrl ?? ""),
        baseUrl: String(e.baseUrl ?? ""),
        codeUrl: String(e.sourceCodeUrl ?? ""),
      });
    }
    return map;
  })();
  return indexPromise;
}

/** Resolve a source by id: curated slug first, then the dynamic index. */
export async function resolveSource(id: string): Promise<SourceInfo | undefined> {
  if (curatedById.has(id)) return curatedById.get(id);
  return (await loadIndex()).get(id);
}

const strip = ({ codeUrl, ...pub }: SourceInfo): PublicSource => pub;

/** Featured sources (default UI list). */
export function listSources(): PublicSource[] {
  return CURATED.map(strip);
}

/** All sources: curated featured first, then the full dynamic index (deduped by name+lang). */
export async function listAllSources(): Promise<PublicSource[]> {
  const index = await loadIndex();
  const seen = new Set(CURATED.map((s) => s.name + "|" + s.lang));
  const dynamic: PublicSource[] = [];
  for (const s of index.values()) {
    const key = s.name + "|" + s.lang;
    if (seen.has(key)) continue;
    seen.add(key);
    dynamic.push(strip(s));
  }
  dynamic.sort((a, b) => a.name.localeCompare(b.name));
  return [...CURATED.map(strip), ...dynamic];
}

const codeCache = new Map<string, string>();

export async function fetchCode(codeUrl: string): Promise<string> {
  const cached = codeCache.get(codeUrl);
  if (cached) return cached;
  const res = await fetch(codeUrl);
  if (!res.ok) throw new Error(`Failed to fetch extension code (${res.status})`);
  const code = await res.text();
  codeCache.set(codeUrl, code);
  return code;
}
