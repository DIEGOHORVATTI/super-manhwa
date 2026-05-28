/**
 * Manual dependency-injection root. Every concrete adapter (id store, cache,
 * source registry, manga catalog, image fetcher) is instantiated once here and
 * wired into use cases. Routes import the use cases directly from this file —
 * mirrors `horvatti-champ/apps/backend/src/container.ts`.
 */
import { env } from "@/config/env";
import { makeJsonlIdStore } from "@/core/infra/jsonl-id-store";
import { makeMemoryCache } from "@/core/infra/memory-cache";
import {
  makeGetChapterPages,
  makeGetMangaDetail,
  makeListGenres,
  makeListLangs,
  makeListPopular,
  makeSearchManga,
  makeSuggestManga,
} from "@/modules/catalog/application";
import {
  makeCuratedSourceRegistry,
  makeMangayomiMangaCatalog,
} from "@/modules/catalog/infrastructure";
import { makeProxyImage } from "@/modules/media/application";
import { makeHttpImageFetcher } from "@/modules/media/infrastructure";

import { makeGetHealth } from "@/modules/system/application";

// Infrastructure (singletons)
const cache = makeMemoryCache();
const idStore = makeJsonlIdStore({
  secret: env.IMAGE_TOKEN_SECRET,
  file: env.ID_STORE_PATH,
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

// System application — `startedAt` captured at module load time so uptime is
// monotonically increasing for the life of the process.
export const getHealth = makeGetHealth(Date.now());
