import { createCipheriv, createDecipheriv, createHash, createHmac } from "node:crypto";

import type { IdStore } from "../domain/id-store";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

const u8 = (b: ArrayLike<number>): Uint8Array => Uint8Array.from(b);

const concat = (...parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
};

/**
 * Stateless opaque-id store. Encrypts `{source, url}` with AES-256-GCM under a
 * key derived from the secret, so ids are fully self-describing | `decode` needs
 * no lookup table, hence no persisted file / Docker volume.
 *
 * The IV is derived deterministically from the plaintext (HMAC of source‖url),
 * so the same input always yields the same id (idempotent aggregation, stable
 * bookmarks) while staying reversible. Rotating the secret invalidates every
 * outstanding id at once | the intended kill-switch.
 *
 * Token layout: base64url( iv[12] ‖ authTag[16] ‖ ciphertext ).
 */
export const makeAesIdStore = ({ secret }: { secret: string }): IdStore => {
  const key = u8(
    createHash("sha256")
      .update(secret || "dev-only-secret-change-in-prod")
      .digest(),
  ); // 32 bytes

  return {
    encode({ source, url }) {
      const plaintext = new TextEncoder().encode(JSON.stringify([source, url]));
      const iv = u8(createHmac("sha256", key).update(`${source}\x00${url}`).digest()).subarray(
        0,
        IV_LEN,
      );
      const cipher = createCipheriv(ALGO, key, iv);
      const body = concat(u8(cipher.update(plaintext)), u8(cipher.final()));
      const token = concat(iv, u8(cipher.getAuthTag()), body);
      return Buffer.from(token).toString("base64url");
    },

    decode(id) {
      try {
        const buf = u8(Buffer.from(id, "base64url"));
        if (buf.length < IV_LEN + TAG_LEN) return null;
        const iv = buf.subarray(0, IV_LEN);
        const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
        const ciphertext = buf.subarray(IV_LEN + TAG_LEN);
        const decipher = createDecipheriv(ALGO, key, iv);
        decipher.setAuthTag(tag);
        const plaintext = concat(u8(decipher.update(ciphertext)), u8(decipher.final()));
        const parsed = JSON.parse(new TextDecoder().decode(plaintext));
        if (
          !Array.isArray(parsed) ||
          typeof parsed[0] !== "string" ||
          typeof parsed[1] !== "string"
        ) {
          return null;
        }
        return { source: parsed[0], url: parsed[1] };
      } catch {
        return null;
      }
    },
  };
};
