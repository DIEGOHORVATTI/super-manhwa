/**
 * Manual dependency-injection root. Every concrete adapter (id store, cache,
 * source registry, manga catalog, image fetcher) is instantiated once here and
 * wired into use cases. Routes import the use cases directly from this file —
 * see `horvatti-champ/apps/backend/src/container.ts` for the pattern.
 */
import { makeMemoryCache } from "@/core/infra/memory-cache";
import { makeJsonlIdStore } from "@/core/infra/jsonl-id-store";

import {
  makeCuratedSourceRegistry,
  makeMangayomiMangaCatalog,
} from "@/modules/catalog/infrastructure";
import {
  makeListPopular, makeSearchManga, makeSuggestManga,
  makeGetMangaDetail, makeGetChapterPages,
  makeListLangs, makeListGenres,
} from "@/modules/catalog/application";

import { makeHttpImageFetcher } from "@/modules/media/infrastructure";
import { makeProxyImage } from "@/modules/media/application";

// Infrastructure (singletons)
const cache = makeMemoryCache();
const idStore = makeJsonlIdStore({
  secret: process.env.IMAGE_TOKEN_SECRET ?? "dev-only-secret-change-in-prod",
  file: process.env.ID_STORE_PATH ?? "/app/data/ids.jsonl",
});
const sourceRegistry = makeCuratedSourceRegistry();
const mangaCatalog = makeMangayomiMangaCatalog();
const imageFetcher = makeHttpImageFetcher();

// Catalog application
export const listPopular = makeListPopular(sourceRegistry, mangaCatalog, idStore, cache);
export const searchManga = makeSearchManga(sourceRegistry, mangaCatalog, idStore, cache);
export const suggestManga = makeSuggestManga(sourceRegistry, mangaCatalog, idStore, cache);
export const getMangaDetail = makeGetMangaDetail(sourceRegistry, mangaCatalog, idStore, cache);
export const getChapterPages = makeGetChapterPages(sourceRegistry, mangaCatalog, idStore, cache);
export const listLangs = makeListLangs(sourceRegistry);
export const listGenres = makeListGenres(listPopular);

// Media application
export const proxyImage = makeProxyImage(idStore, sourceRegistry, imageFetcher);
