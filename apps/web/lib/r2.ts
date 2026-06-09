import "server-only";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Cloudflare R2 (S3-compatible) client. Gated on the full credential set —
 * `r2Enabled` lets callers (cache-on-read, user-work uploads) skip R2 and fall
 * back to the in-memory image proxy when storage isn't configured.
 *
 * Public reads go through `R2_PUBLIC_URL` (a bucket public domain / CDN), so we
 * never sign GET URLs for hot-path image delivery.
 */
const accountId = process.env.R2_ACCOUNT_ID;
const endpoint = process.env.R2_ENDPOINT;
const bucket = process.env.R2_BUCKET;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const publicUrl = process.env.R2_PUBLIC_URL;

export const r2Enabled = Boolean(
  endpoint && bucket && accessKeyId && secretAccessKey && publicUrl,
);

let cached: S3Client | null = null;

function client(): S3Client {
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 is not configured");
  }
  if (!cached) {
    cached = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return cached;
}

/** Joins a public base URL and an object key, normalizing the slash boundary. */
export function joinPublicUrl(base: string, key: string): string {
  return `${base.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
}

/** Public URL for a stored object (served by R2_PUBLIC_URL / CDN, no signing). */
export function publicUrlFor(key: string): string {
  return joinPublicUrl(publicUrl!, key);
}

/** Upload bytes. Returns the object key (caller persists it alongside the row). */
export async function putObject(
  key: string,
  body: Uint8Array | Buffer,
  contentType: string,
): Promise<string> {
  await client().send(
    new PutObjectCommand({ Bucket: bucket!, Key: key, Body: body, ContentType: contentType }),
  );
  return key;
}

/** Fetch an object's bytes (used when re-streaming through the app). */
export async function getObject(key: string): Promise<Uint8Array> {
  const res = await client().send(new GetObjectCommand({ Bucket: bucket!, Key: key }));
  return res.Body!.transformToByteArray();
}

export { accountId };
