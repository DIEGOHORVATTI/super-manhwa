/**
 * Manual dependency-injection root. Every concrete adapter (id store, cache,
 * connector registry, image fetcher) is instantiated once here and wired into
 * use cases. Routes import the use cases directly from this file.
 */
import { env } from "@/config/env";
import { makeAesIdStore } from "@/core/infra/aes-id-store";
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
import { makeAniListCatalog, makeConnectorRegistry } from "@/modules/catalog/infrastructure";
import { makeProxyImage } from "@/modules/media/application";
import { makeHttpImageFetcher, makeImageByteCache } from "@/modules/media/infrastructure";
import { makeGetMangaMeta } from "@/modules/metadata/application";
import { makeAniListProvider } from "@/modules/metadata/infrastructure";
import { makeGetHealth } from "@/modules/system/application";

// Infrastructure (singletons)
const cache = makeMemoryCache();
// Stateless: chapter/image tokens are self-describing (AES-GCM), so there's no
// lookup file to persist — manga ids are AniList ids, not minted here.
const idStore = makeAesIdStore({ secret: env.IMAGE_TOKEN_SECRET });
const connectorRegistry = makeConnectorRegistry();
const imageFetcher = makeHttpImageFetcher();
// Shared, byte-bounded cache so a cover/page is pulled from the source CDN once
// and then served to every session from memory (see ADR-0009/0010).
const imageByteCache = makeImageByteCache();
const metadataProvider = makeAniListProvider();
// AniList drives discovery + work identity; connectors only resolve chapters.
const catalog = makeAniListCatalog();

// Catalog application
export const listPopular = makeListPopular(catalog, idStore, cache);
export const searchManga = makeSearchManga(catalog, idStore, cache);
export const suggestManga = makeSuggestManga(catalog, idStore, cache);
export const getMangaDetail = makeGetMangaDetail(catalog, connectorRegistry, idStore, cache);
export const getChapterPages = makeGetChapterPages(connectorRegistry, idStore, cache);
export const listLangs = makeListLangs(connectorRegistry);
export const listGenres = makeListGenres(catalog, cache);

// Metadata application (AniList enrichment)
export const getMangaMeta = makeGetMangaMeta(metadataProvider, idStore, cache);

// Media application
export const proxyImage = makeProxyImage(idStore, connectorRegistry, imageFetcher, imageByteCache);

// System application — `startedAt` captured at module load time so uptime is
// monotonically increasing for the life of the process.
export const getHealth = makeGetHealth(Date.now());
