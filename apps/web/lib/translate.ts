import type { MangaSummary } from "@packages/contracts";
import { unstable_cache } from "next/cache";

// Free Google-translate proxy: POST { text, from, to } → a JSON string ("olá…").
const ENDPOINT = "https://translate-google-api-v1.vercel.app/translate";
const MAX_CHARS = 4800; // keep requests well under the proxy's limit
const TIMEOUT_MS = 6000;

/** Stable short key for the cache (descriptions are long to use verbatim). */
function keyFor(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `${(h >>> 0).toString(36)}-${s.length}`;
}

async function translateRaw(text: string, to: string): Promise<string> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.slice(0, MAX_CHARS), from: "auto", to }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`translate HTTP ${res.status}`);
  const out = await res.json(); // the API returns a JSON-encoded string
  if (typeof out !== "string" || !out.trim()) throw new Error("empty translation");
  return out;
}

/**
 * Translate text to Brazilian Portuguese, server-side and cached for 30 days so
 * the same description is sent to the proxy at most once (SEO-friendly: the
 * translated text is server-rendered). Fixed target = pt-br by design; per-user
 * translation would defeat caching and SEO. Any failure (timeout, error) falls
 * back to the original text and is NOT cached, so it retries next time.
 */
export async function translatePt(text?: string | null): Promise<string> {
  const src = (text ?? "").trim();
  if (!src) return "";
  const cached = unstable_cache(() => translateRaw(src, "pt"), ["translate-pt", keyFor(src)], {
    revalidate: 60 * 60 * 24 * 30,
  });
  try {
    return await cached();
  } catch {
    return src;
  }
}

/**
 * Translate the hover-teaser `description` of a listing in place. Each text is
 * cached 30d (see translatePt) so a warm cache makes this free; only the grid
 * shows descriptions on hover, so rows (PosterRow) skip this.
 * ponytail: N parallel calls on a cold cache. Upgrade path if it ever drags the
 * first render: persist the translated description in `cachedWorks` and read it
 * back here instead of hitting the proxy.
 */
export async function translateSummaries(list: readonly MangaSummary[]): Promise<MangaSummary[]> {
  return Promise.all(
    list.map(async (m) =>
      m.description ? { ...m, description: await translatePt(m.description) } : m,
    ),
  );
}
