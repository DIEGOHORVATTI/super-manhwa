/**
 * Manual dependency-injection root. Every concrete adapter (id store, cache,
 * connector registry, image fetcher) is instantiated once here and wired into
 * use cases. Routes import the use cases directly from this file.
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
import { makeConnectorRegistry } from "@/modules/catalog/infrastructure";
import { makeProxyImage } from "@/modules/media/application";
import { makeHttpImageFetcher } from "@/modules/media/infrastructure";
import { makeGetMangaMeta } from "@/modules/metadata/application";
import { makeAniListProvider } from "@/modules/metadata/infrastructure";
import { makeGetHealth } from "@/modules/system/application";

// Infrastructure (singletons)
const cache = makeMemoryCache();
const idStore = makeJsonlIdStore({
  secret: env.IMAGE_TOKEN_SECRET,
  file: env.ID_STORE_PATH,
});
const connectorRegistry = makeConnectorRegistry();
const imageFetcher = makeHttpImageFetcher();
const metadataProvider = makeAniListProvider();

// Catalog application
export const listPopular = makeListPopular(connectorRegistry, idStore, cache);
export const searchManga = makeSearchManga(connectorRegistry, idStore, cache);
export const suggestManga = makeSuggestManga(connectorRegistry, idStore, cache);
export const getMangaDetail = makeGetMangaDetail(connectorRegistry, idStore, cache);
export const getChapterPages = makeGetChapterPages(connectorRegistry, idStore, cache);
export const listLangs = makeListLangs(connectorRegistry);
export const listGenres = makeListGenres(listPopular);

// Metadata application (AniList enrichment)
export const getMangaMeta = makeGetMangaMeta(metadataProvider, idStore, cache);

// Media application
export const proxyImage = makeProxyImage(idStore, connectorRegistry, imageFetcher);

// System application — `startedAt` captured at module load time so uptime is
// monotonically increasing for the life of the process.
export const getHealth = makeGetHealth(Date.now());
