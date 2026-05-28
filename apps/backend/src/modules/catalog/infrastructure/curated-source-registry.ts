import { httpFetch } from "@/shared/http-fetch";

import type { Source, SourceRegistry } from "../domain/source";
import type { MangayomiIndex } from "./mangayomi-index";

const RAW =
  "https://raw.githubusercontent.com/kodjodevf/mangayomi-extensions/main/javascript/manga/src/";
const INDEX_URL =
  "https://raw.githubusercontent.com/kodjodevf/mangayomi-extensions/main/index.json";

/**
 * Hand-picked, validated sources we actively aggregate from. CF-protected ones
 * stay in the registry but are excluded from popular-list aggregation by the
 * use case — they only get used as fallback targets when a name is known.
 */
const CURATED: readonly Source[] = [
  {
    id: "mangadex",
    name: "MangaDex",
    lang: "en",
    hasCloudflare: false,
    isNsfw: false,
    featured: true,
    baseUrl: "https://mangadex.org",
    iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=mangadex.org",
    codeUrl: RAW + "all/mangadex.js",
  },
  {
    id: "webtoons",
    name: "Webtoons",
    lang: "en",
    hasCloudflare: false,
    isNsfw: false,
    featured: true,
    baseUrl: "https://www.webtoons.com",
    iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=webtoons.com",
    codeUrl: RAW + "all/webtoons.js",
  },
  {
    id: "weebcentral",
    name: "Weeb Central",
    lang: "en",
    hasCloudflare: false,
    isNsfw: false,
    featured: true,
    baseUrl: "https://weebcentral.com",
    iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=weebcentral.com",
    codeUrl: RAW + "en/weebcentral.js",
  },
  {
    id: "mangaworld",
    name: "MangaWorld",
    lang: "it",
    hasCloudflare: false,
    isNsfw: false,
    featured: true,
    baseUrl: "https://www.mangaworld.cx",
    iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=mangaworld.cx",
    codeUrl: RAW + "it/mangaworld.js",
  },
  {
    id: "manhwaz",
    name: "Manhwaz",
    lang: "en",
    hasCloudflare: false,
    isNsfw: false,
    featured: true,
    baseUrl: "https://manhwaz.com",
    iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=manhwaz.com",
    codeUrl: RAW + "en/manhwaz.js",
  },
  {
    id: "asurascans",
    name: "Asura Scans",
    lang: "en",
    hasCloudflare: true,
    isNsfw: false,
    featured: true,
    baseUrl: "https://asuracomic.net",
    iconUrl: "https://www.google.com/s2/favicons?sz=64&domain=asuracomic.net",
    codeUrl: RAW + "en/asurascans.js",
  },
] as const;

const curatedById = new Map(CURATED.map((s) => [s.id, s]));

export const makeCuratedSourceRegistry = (): SourceRegistry => {
  let dynamicPromise: Promise<Map<string, Source>> | undefined;

  const loadDynamic = async (): Promise<Map<string, Source>> => {
    dynamicPromise ??= (async () => {
      const result = await httpFetch<MangayomiIndex>(INDEX_URL);
      if (result.error) {
        throw new Error(`Failed to fetch index.json: ${result.error.message}`);
      }
      const map = new Map<string, Source>();
      for (const e of result.value) {
        if (e.sourceCodeLanguage !== 1 || e.itemType !== 0) continue; // JS manga only
        const id = `id-${e.id}`;
        map.set(id, {
          id,
          name: e.name,
          lang: e.lang,
          hasCloudflare: Boolean(e.hasCloudflare),
          isNsfw: Boolean(e.isNsfw),
          iconUrl: e.iconUrl ?? "",
          baseUrl: e.baseUrl ?? "",
          codeUrl: e.sourceCodeUrl,
        });
      }
      return map;
    })();
    return dynamicPromise;
  };

  return {
    listCurated: () => CURATED,
    async resolve(id) {
      if (curatedById.has(id)) return curatedById.get(id);
      return (await loadDynamic()).get(id);
    },
  };
};
