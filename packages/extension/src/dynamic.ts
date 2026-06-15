import { getCuratedConnector } from "./connectors/index";
import { createMangayomiConnector } from "./shared/mangayomi-factory";
import type { MangaConnector } from "./types";

/**
 * Lazy resolver for sources that aren't in our curated set | backed by the
 * upstream Mangayomi index. Used when an opaque manga/chapter id decodes to
 * a source we haven't bothered to vendor.
 *
 * The active upstream is `kodjodevf.github.io/mangayomi-extensions/index.json`
 * which points at the `entityJY/mangayomi-extensions-eJ` fork (downstream of
 * `m2k3a/mangayomi-extensions`, which is the actual maintainer). See
 * `EXTENSIONS_SYNC.md` at the package root.
 */

const INDEX_URL = "https://kodjodevf.github.io/mangayomi-extensions/index.json";

interface UpstreamEntry {
  id: number;
  name: string;
  lang: string;
  sourceCodeUrl: string;
  sourceCodeLanguage: number; // 1 = JS
  itemType: number; // 0 = manga
  baseUrl?: string;
  iconUrl?: string;
  hasCloudflare?: boolean;
  isNsfw?: boolean;
}

let indexPromise: Promise<Map<string, UpstreamEntry>> | undefined;

const loadIndex = (): Promise<Map<string, UpstreamEntry>> => {
  indexPromise ??= (async () => {
    const res = await fetch(INDEX_URL);
    if (!res.ok) throw new Error(`upstream index ${res.status}`);
    const all = (await res.json()) as UpstreamEntry[];
    const map = new Map<string, UpstreamEntry>();
    for (const e of all) {
      if (e.sourceCodeLanguage !== 1 || e.itemType !== 0) continue;
      map.set(`id-${e.id}`, e);
    }
    return map;
  })();
  return indexPromise;
};

/**
 * Get a connector for an arbitrary source id. Curated ids resolve instantly
 * (no IO); dynamic ids (`id-<n>`) hit the upstream index once and cache
 * a Mangayomi-backed connector wrapper for the rest of the process lifetime.
 */
export const resolveConnector = async (id: string): Promise<MangaConnector | undefined> => {
  const curated = getCuratedConnector(id);
  if (curated) return curated;

  const index = await loadIndex();
  const entry = index.get(id);
  if (!entry) return undefined;

  return createMangayomiConnector({
    id,
    name: entry.name,
    langs: [entry.lang],
    baseUrl: entry.baseUrl ?? "",
    iconUrl: entry.iconUrl ?? "",
    hasCloudflare: Boolean(entry.hasCloudflare),
    isNsfw: Boolean(entry.isNsfw),
    source: { kind: "remote", url: entry.sourceCodeUrl },
  });
};
