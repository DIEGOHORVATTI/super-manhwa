import "server-only";
import { deleteObject, getObject, publicUrlFor, putObject, r2Enabled } from "@/lib/r2";

export type EmojiEntry = { name: string; path: string };
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

/**
 * Public-facing emoji list: manifest entries enriched with their CDN URL.
 * Returned by GET /api/emojis.
 */
export type EmojiPublic = EmojiEntry & { url: string };

export async function listEmojisPublic(): Promise<EmojiPublic[]> {
  const manifest = await readManifest();
  return Object.values(manifest).map((e) => ({
    ...e,
    url: publicUrlFor(e.path),
  }));
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
  return { name, path, url: publicUrlFor(path) };
}

/** Remove an emoji: delete image + remove from manifest. */
export async function removeEmoji(name: string): Promise<void> {
  const manifest = await readManifest();
  const entry = manifest[name];
  if (!entry) return;
  try {
    await deleteObject(entry.path);
  } catch {}
  delete manifest[name];
  await writeManifest(manifest);
}
