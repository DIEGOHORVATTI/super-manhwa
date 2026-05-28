/**
 * Opaque-id minting port. The catalog mints `id`s for mangas, chapters and
 * cover/page URLs; the media module decodes them back to (source, url).
 *
 * Implementations must be deterministic: same (source, url) always yields the
 * same id, so re-running aggregation is idempotent and bookmarks never break
 * unless the secret rotates.
 */
export type Ref = { source: string; url: string };

export type IdStore = {
  encode(ref: Ref): string;
  decode(id: string): Ref | null;
};
