import "server-only";
import { deleteObject, getObject, publicUrlFor, putObject, r2Enabled } from "@/lib/r2";

/** R2-stored emoji (path) or external URL emoji — both end up with a resolved `url`. */
export type EmojiEntry = { name: string; path?: string; url?: string };
export type EmojiManifest = Record<string, EmojiEntry>;

const MANIFEST_KEY = "emojis/manifest.json";

/** Read the emoji manifest from R2. Returns {} if not yet created or R2 is off. */
export async function readManifest(): Promise<EmojiManifest> {
  if (!r2Enabled) return {};
  try {
    const bytes = await getObject(MANIFEST_KEY);
    return JSON.parse(new TextDecoder().decode(bytes)) as EmojiManifest;
  } catch {
    return {};
  }
}

/** Write the emoji manifest to R2. */
export async function writeManifest(manifest: EmojiManifest): Promise<void> {
  await putObject(MANIFEST_KEY, Buffer.from(JSON.stringify(manifest)), "application/json");
}

/** Resolve the public URL for any entry (R2 path or external url). */
function resolveUrl(e: EmojiEntry): string {
  return e.url ?? (e.path ? publicUrlFor(e.path) : "");
}

/**
 * Public-facing emoji list: manifest entries enriched with their CDN URL.
 * Returned by GET /api/emojis.
 */
export type EmojiPublic = { name: string; url: string };

export async function listEmojisPublic(): Promise<EmojiPublic[]> {
  const manifest = await readManifest();
  return Object.values(manifest).map((e) => ({ name: e.name, url: resolveUrl(e) }));
}

/** Register a new emoji: upload image bytes + update manifest. */
export async function addEmoji(
  name: string,
  imageBytes: Uint8Array,
  contentType: string,
  ext: string,
): Promise<EmojiPublic> {
  const path = `emojis/${name}.${ext}`;
  await putObject(path, imageBytes, contentType);
  const manifest = await readManifest();
  manifest[name] = { name, path };
  await writeManifest(manifest);
  return { name, url: publicUrlFor(path) };
}

/** Register emojis by external URL without downloading (bulk-friendly). */
export async function addEmojiUrls(
  emojis: { name: string; url: string }[],
): Promise<EmojiPublic[]> {
  const manifest = await readManifest();
  const added: EmojiPublic[] = [];
  for (const e of emojis) {
    const key = e.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "");
    if (!key || !e.url) continue;
    manifest[key] = { name: key, url: e.url };
    added.push({ name: key, url: e.url });
  }
  await writeManifest(manifest);
  return added;
}

/** Remove an emoji: delete R2 object if present, remove from manifest. */
export async function removeEmoji(name: string): Promise<void> {
  const manifest = await readManifest();
  const entry = manifest[name];
  if (!entry) return;
  if (entry.path) {
    try {
      await deleteObject(entry.path);
    } catch {}
  }
  delete manifest[name];
  await writeManifest(manifest);
}
