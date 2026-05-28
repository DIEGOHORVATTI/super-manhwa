import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

/**
 * Opaque image tokens. The real CDN URL + source are AES-256-GCM encrypted into a
 * token; the browser only ever sees `/i/<token>` and the bytes — never the real URL
 * nor the origin. Server-side only (node:crypto + a server secret).
 */
const SECRET = process.env.IMAGE_TOKEN_SECRET ?? "dev-only-secret-change-in-prod";
const key = new Uint8Array(createHash("sha256").update(SECRET).digest()); // 32 bytes

export function encodeImage(source: string, url: string): string {
  const iv = new Uint8Array(randomBytes(12));
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify({ s: source, u: url }), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function decodeImage(token: string): { s: string; u: string } | null {
  try {
    const buf = Buffer.from(token, "base64url");
    const iv = new Uint8Array(buf.subarray(0, 12));
    const tag = new Uint8Array(buf.subarray(12, 28));
    const enc = new Uint8Array(buf.subarray(28));
    const d = createDecipheriv("aes-256-gcm", key, iv);
    d.setAuthTag(tag);
    const dec = Buffer.concat([d.update(enc), d.final()]).toString("utf8");
    return JSON.parse(dec) as { s: string; u: string };
  } catch {
    return null;
  }
}

/** Build the opaque same-origin image src for the browser. */
export const imageSrc = (source: string, url?: string): string =>
  url ? `/i/${encodeImage(source, url)}` : "";
