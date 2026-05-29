import { runExtension } from "../runtime/sandbox";
import type { ConnectorMeta, MangaConnector, RawDetail, RawListPage, RawPage } from "../types";
import { loadMangaExtension } from "./load-extension";

/**
 * One module-scope cache for every fetched/loaded extension source — across
 * all Mangayomi-backed connectors built in this process.
 */
const codeCache = new Map<string, string>();

export interface MangayomiConnectorInit extends ConnectorMeta {
  /**
   * Either a vendored relative path (e.g. `all/mangadex.js`) — loaded from
   * `packages/extension/javascript/manga/src/` — or an absolute `https://`
   * URL fetched on demand. The dynamic-source path uses the latter.
   */
  source: { kind: "vendored"; path: string } | { kind: "remote"; url: string };

  /**
   * Default per-call timeouts in milliseconds. Override per source if a
   * mirror is known to be slow.
   */
  timeouts?: {
    popular?: number;
    search?: number;
    detail?: number;
    pages?: number;
    count?: number;
  };

  /**
   * Expose the optional `getChapterCount` capability — set only for bundles
   * whose JS actually implements the method (e.g. MangaDex via `/aggregate`).
   */
  hasChapterCount?: boolean;
}

const DEFAULT_TIMEOUTS = {
  popular: 15_000,
  search: 15_000,
  detail: 25_000,
  pages: 25_000,
  count: 8_000,
};

const resolveSource = async (source: MangayomiConnectorInit["source"]): Promise<string> => {
  const key = source.kind === "vendored" ? `v:${source.path}` : `r:${source.url}`;
  const hit = codeCache.get(key);
  if (hit) return hit;

  let code: string;
  if (source.kind === "vendored") {
    code = await loadMangaExtension(source.path);
  } else {
    const res = await fetch(source.url);
    if (!res.ok) throw new Error(`fetch ${source.url} → HTTP ${res.status}`);
    code = await res.text();
  }
  codeCache.set(key, code);
  return code;
};

/**
 * Build a `MangaConnector` whose four data methods execute a Mangayomi-format
 * JS bundle in QuickJS via the runtime. The bundle can be vendored locally or
 * pulled from a remote URL (the dynamic-source path).
 *
 * For sources we author ourselves in native TypeScript, skip this factory and
 * implement `MangaConnector` directly — see `connectors/native/` for examples.
 */
export const createMangayomiConnector = (init: MangayomiConnectorInit): MangaConnector => {
  const timeouts = { ...DEFAULT_TIMEOUTS, ...init.timeouts };

  const run = async <T>(method: string, args: unknown[], timeoutMs: number): Promise<T> => {
    const code = await resolveSource(init.source);
    return runExtension<T>({
      code,
      method,
      args,
      source: { lang: init.lang },
      cloudflare: init.hasCloudflare,
      timeoutMs,
    });
  };

  return {
    id: init.id,
    name: init.name,
    lang: init.lang,
    baseUrl: init.baseUrl,
    iconUrl: init.iconUrl,
    hasCloudflare: init.hasCloudflare,
    isNsfw: init.isNsfw,
    featured: init.featured,
    getPopular: (page) => run<RawListPage>("getPopular", [page], timeouts.popular!),
    search: (query, page) => run<RawListPage>("search", [query, page, []], timeouts.search!),
    getDetail: (link) => run<RawDetail>("getDetail", [link], timeouts.detail!),
    getPageList: (chapterUrl) => run<RawPage[]>("getPageList", [chapterUrl], timeouts.pages!),
    ...(init.hasChapterCount
      ? {
          getChapterCount: (link: string) =>
            run<number>("getChapterCount", [link], timeouts.count!),
        }
      : {}),
  };
};
