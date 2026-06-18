import type { WorkFormat } from "@packages/contracts";

import type { Cache } from "@/core/domain/cache";
import type { IdStore } from "@/core/domain/id-store";

import type { CatalogSource } from "../domain/catalog-source";
import type { ConnectorRegistry } from "../infrastructure/connector-registry";
import { titleMatches } from "./completeness";

const PREFERRED_LANG = "pt-br";
const FORMATS_TTL = 10 * 60 * 1000;
const SEARCH_TTL = 10 * 60 * 1000;
const DETAIL_TTL = 10 * 60 * 1000;

type FormatLink = { format: WorkFormat; id: string };

/**
 * Which formats a work can be read in, with the opaque id to open each | powers
 * the detail page's format switcher. The "current" id is always returned; we
 * then probe the *other* axis by title:
 *   - a manga work → search NOVEL connectors for a same-title novel twin;
 *   - a novel work → search the AniList catalog for the manga twin.
 * Everything is best-effort and cached, so an unavailable twin just isn't listed
 * (the switcher then renders nothing). No persisted cross-source mapping yet |
 * ponytail: resolve live + cache; add a `work_formats` table only if this probe
 * gets hot or needs to be authored by hand.
 */
export const makeListFormats =
  (catalog: CatalogSource, registry: ConnectorRegistry, idStore: IdStore, cache: Cache) =>
  async ({ id, name }: { id: string; name?: string }): Promise<{ formats: FormatLink[] }> =>
    cache.remember(`formats:${id}`, FORMATS_TTL, async () => {
      const ref = idStore.decode(id);
      let currentFormat: WorkFormat = "manga";
      let title = name?.trim();

      if (ref) {
        const c = await registry.resolve(ref.source);
        if (c) currentFormat = c.format ?? "manga";
        if (!title && c) {
          try {
            const lang = c.langs.includes(PREFERRED_LANG) ? PREFERRED_LANG : c.langs[0];
            const raw = await cache.remember(`detail:${c.id}:${lang}:${ref.url}`, DETAIL_TTL, () =>
              c.getDetail(ref.url, lang),
            );
            title = (raw?.title ?? raw?.name)?.trim();
          } catch {
            /* no title hint → can't probe the twin */
          }
        }
      }

      const formats: FormatLink[] = [{ format: currentFormat, id }];
      if (!title) return { formats };
      const targets = [title];

      if (currentFormat === "novel") {
        try {
          const { items } = await cache.remember(
            `fmt-catalog:${title.toLowerCase()}`,
            SEARCH_TTL,
            () => catalog.search(title!, 1),
          );
          const hit = items.find((it) => titleMatches(it.title, targets));
          if (hit) formats.push({ format: "manga", id: hit.id });
        } catch {
          /* catalog down → manga twin omitted */
        }
      } else {
        for (const c of registry.listCurated().filter((x) => x.format === "novel")) {
          try {
            const lang = c.langs.includes(PREFERRED_LANG) ? PREFERRED_LANG : c.langs[0];
            const r = await cache.remember(
              `search:${c.id}:${lang}:${title.toLowerCase()}`,
              SEARCH_TTL,
              () => c.search(title!, 1, lang),
            );
            const hit = (r.list ?? []).find((m) => titleMatches(m.name, targets));
            if (hit) {
              formats.push({
                format: c.format ?? "novel",
                id: idStore.encode({ source: c.id, url: hit.link }),
              });
              break;
            }
          } catch {
            /* this novel source failed → try the next */
          }
        }
      }

      return { formats };
    });
