import { runExtension } from "@packages/extension-runtime";

import type { MangaCatalog, RawDetail, RawListPage } from "../domain/manga-catalog";
import type { Source } from "../domain/source";

const codeCache = new Map<string, string>();

const fetchCode = async (codeUrl: string): Promise<string> => {
  const cached = codeCache.get(codeUrl);
  if (cached) return cached;
  const res = await fetch(codeUrl);
  if (!res.ok) throw new Error(`Failed to fetch extension code (${res.status})`);
  const code = await res.text();
  codeCache.set(codeUrl, code);
  return code;
};

/**
 * MangaCatalog backed by Mangayomi JS extensions running in QuickJS via the
 * shared extension-runtime package. The extension's source code is fetched
 * once and cached in module scope (warm across Vercel/Bun invocations).
 */
export const makeMangayomiMangaCatalog = (): MangaCatalog => {
  const run = async <T>(src: Source, method: string, args: unknown[], timeoutMs: number): Promise<T> => {
    const code = await fetchCode(src.codeUrl);
    return runExtension<T>({
      code, method, args,
      source: { lang: src.lang },
      cloudflare: src.hasCloudflare,
      timeoutMs,
    });
  };

  return {
    getPopular: (src, page) => run<RawListPage>(src, "getPopular", [page], 15_000),
    search: (src, query, page) => run<RawListPage>(src, "search", [query, page, []], 15_000),
    getDetail: (src, link) => run<RawDetail>(src, "getDetail", [link], 25_000),
    getPageList: (src, chapterUrl) => run<Array<string | { url: string }>>(src, "getPageList", [chapterUrl], 25_000),
  };
};
