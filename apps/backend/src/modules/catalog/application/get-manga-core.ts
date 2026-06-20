import type { MangaCore } from "@packages/contracts";

import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";
import { notFound } from "@/shared/errors";
import { signCoverPath } from "@/shared/image-sign";

import type { CatalogSource } from "../domain/catalog-source";
import type { ConnectorRegistry } from "../infrastructure/connector-registry";
import { MangaMapper } from "../infrastructure/manga-mapper";
import { titleMatches } from "./completeness";
import { loadWork } from "./work-cache";

/** Reading language the page presents chapters in | kept aligned with the
 *  chapters route so both halves agree on a default. */
const PREFERRED_LANG = "pt-br";
/** Connector detail cache window | shares the key used by the chapters route. */
const DETAIL_TTL = 10 * 60 * 1000;
const ENRICH_TTL = 10 * 60 * 1000;

/**
 * Fast half of the obra page: a work's non-chapter metadata (title, cover,
 * description, genres, status). Identity comes from the AniList catalog | the
 * `id` is an AniList id | so this resolves in a single (cached) round-trip and
 * the page can paint its hero immediately while the cross-source chapter fan-out
 * ({@link makeGetMangaChapters}) streams in separately.
 */
/** Find this work in the AniList catalog by title (cached, confident match only). */
const findCatalogMatch = async (cache: Cache, catalog: CatalogSource, title: string) =>
  cache.remember(`core-enrich:${title.toLowerCase()}`, ENRICH_TTL, async () => {
    const { items } = await catalog.search(title, 1);
    return items.find((it) => titleMatches(it.title, [title])) ?? null;
  });

export const makeGetMangaCore =
  (catalog: CatalogSource, registry: ConnectorRegistry, idStore: IdStore, cache: Cache) =>
  async ({
    id,
    name,
  }: {
    id: string;
    name?: string;
  }): Promise<{ core: MangaCore; lang: string }> => {
    // Connector-only works carry an opaque {source,url} id (no AniList behind
    // them). Resolve those straight from the reading source so the work is
    // first-class in our catalog | real cover + author/genre/status/synopsis |
    // not just a bare title. Best-effort: any failure falls through to the
    // AniList/name path below, so nothing regresses.
    const ref = idStore.decode(id);
    if (ref) {
      const connector = await registry.resolve(ref.source);
      if (connector) {
        try {
          const lang = connector.langs.includes(PREFERRED_LANG)
            ? PREFERRED_LANG
            : connector.langs[0];
          const raw = await cache.remember(
            `detail:${connector.id}:${lang}:${ref.url}`,
            DETAIL_TTL,
            () => connector.getDetail(ref.url, lang),
          );
          const d = MangaMapper.toDetail(idStore, connector, raw ?? {}, lang);

          // Enrich with our AniList catalog when a confident title match exists,
          // so connector works (e.g. novels) carry the catalog's richer metadata
          // (cover/synopsis/genres/status) instead of the source's sparser data.
          // Best-effort + cached | no match (e.g. a novel AniList lacks) keeps the
          // connector's own metadata.
          const title = d.title ?? name;
          let ani: Awaited<ReturnType<typeof findCatalogMatch>> = null;
          if (title) {
            ani = await findCatalogMatch(cache, catalog, title).catch(() => null);
          }
          const aniCover = ani?.imageUrl
            ? signCoverPath(`/api/img/${idStore.encode({ source: "anilist", url: ani.imageUrl })}`)
            : undefined;

          return {
            core: {
              title: d.title ?? name,
              description: ani?.description ?? d.description,
              author: d.author,
              artist: d.artist,
              genre: ani?.genres ?? d.genre,
              status: ani?.status ?? d.status,
              imageUrl: aniCover ?? d.imageUrl,
              // So the detail page knows which reader to link (novel ⇒ text).
              format: connector.format,
              aliases: [],
            },
            lang: d.lang,
          };
        } catch {
          /* connector down | fall through to the AniList/name path */
        }
      }
    }

    const work = await loadWork(cache, catalog, id);
    if (!work && !name) throw notFound("unknown work");

    const imageUrl = work?.imageUrl
      ? signCoverPath(`/api/img/${idStore.encode({ source: "anilist", url: work.imageUrl })}`)
      : undefined;

    const core: MangaCore = {
      title: work?.title ?? name,
      description: work?.description,
      genre: work?.genres,
      status: work?.status,
      imageUrl,
      // So the reader/detail know which reader to open (novel ⇒ text).
      format: work?.format,
      aliases: work?.aliases ?? [],
    };
    return { core, lang: PREFERRED_LANG };
  };
