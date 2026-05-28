import { createHmac } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

import type { IdStore, Ref } from "../domain/id-store";

interface Entry {
  id: string;
  s: string;
  u: string;
}

/**
 * Append-only JSONL-backed short-id store. Reads the whole file once at boot
 * into a Map; subsequent encodes append a single line. Survives container
 * restarts via a Docker volume mount at `/app/data`.
 *
 * - id = base64url(HMAC-SHA256(secret, source||url)[:SHORT_BYTES])
 * - SHORT_BYTES=5 → 7-char ids; <0.01% collision at 10k entries.
 *
 * Rotating the secret invalidates every outstanding id at once (intentional —
 * used as a kill-switch).
 */
export const makeJsonlIdStore = ({
  secret,
  file,
  shortBytes = 5,
}: {
  secret: string;
  file: string;
  shortBytes?: number;
}): IdStore => {
  const key = secret || "dev-only-secret-change-in-prod";
  const map = new Map<string, Ref>();

  // Boot-time load. Tolerates corrupt lines.
  try {
    if (existsSync(file)) {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        if (!line) continue;
        try {
          const e = JSON.parse(line) as Entry;
          map.set(e.id, { source: e.s, url: e.u });
        } catch {
          /* skip corrupt line */
        }
      }
      console.log(`[idstore] loaded ${map.size} ids from ${file}`);
    }
  } catch (e) {
    console.warn("[idstore] load failed:", e);
  }

  const shortId = (source: string, url: string): string =>
    createHmac("sha256", key)
      .update(`${source}\x00${url}`)
      .digest()
      .subarray(0, shortBytes)
      .toString("base64url");

  return {
    encode({ source, url }) {
      const id = shortId(source, url);
      if (!map.has(id)) {
        map.set(id, { source, url });
        try {
          mkdirSync(dirname(file), { recursive: true });
          appendFileSync(file, JSON.stringify({ id, s: source, u: url } satisfies Entry) + "\n");
        } catch (e) {
          console.warn("[idstore] persist failed:", e);
        }
      }
      return id;
    },

    decode(id) {
      return map.get(id) ?? null;
    },
  };
};
