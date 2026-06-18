import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { addEmoji } from "@/lib/emoji-manifest";
import { hasRole } from "@/lib/roles";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  Accept: "application/json, */*",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  Referer: "https://atsu.moe/",
  Origin: "https://atsu.moe",
};

// Known candidate endpoints on atsu.moe — tried in order until one returns data.
const CANDIDATES = [
  "https://atsu.moe/api/emojis",
  "https://atsu.moe/api/stickers",
  "https://atsu.moe/api/v1/emojis",
  "https://atsu.moe/api/v1/stickers",
  "https://atsu.moe/api/reactions",
  "https://atsu.moe/api/custom-emojis",
];

async function discoverEmojiList(): Promise<{ name: string; url: string }[] | null> {
  for (const url of CANDIDATES) {
    try {
      const r = await fetch(url, { headers: BROWSER_HEADERS });
      if (!r.ok) continue;
      const data = (await r.json()) as unknown;
      // Try to extract an array of {name, url/path/src} from common shapes
      const arr = Array.isArray(data)
        ? data
        : Array.isArray((data as { data?: unknown }).data)
          ? (data as { data: unknown[] }).data
          : Array.isArray((data as { emojis?: unknown }).emojis)
            ? (data as { emojis: unknown[] }).emojis
            : Array.isArray((data as { stickers?: unknown }).stickers)
              ? (data as { stickers: unknown[] }).stickers
              : null;
      if (!arr || arr.length === 0) continue;
      const mapped = (arr as Record<string, unknown>[])
        .map((e) => {
          const name = String(e.name ?? e.slug ?? e.id ?? "").toLowerCase();
          const rawUrl = String(e.url ?? e.src ?? e.path ?? e.image ?? e.imageUrl ?? "");
          if (!name || !rawUrl) return null;
          const resolved = rawUrl.startsWith("http")
            ? rawUrl
            : `https://atsu.moe${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
          return { name, url: resolved };
        })
        .filter((e): e is { name: string; url: string } => e !== null);
      if (mapped.length > 0) return mapped;
    } catch {
      // try next candidate
    }
  }
  return null;
}

/**
 * POST /api/admin/emojis/sync
 * Fetches atsu.moe's emoji catalog server-side and imports all images to R2.
 * Optionally accepts { source: "url" } in body to use a custom endpoint.
 */
export async function POST(req: Request) {
  const session = await getServerSession();
  if (!hasRole(session?.user, "staff")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { source?: string };

  let list: { name: string; url: string }[] | null = null;

  if (body.source) {
    // User-supplied endpoint
    try {
      const r = await fetch(body.source, { headers: BROWSER_HEADERS });
      if (r.ok) {
        const data = (await r.json()) as unknown;
        list = Array.isArray(data) ? (data as { name: string; url: string }[]) : null;
      }
    } catch {}
  } else {
    list = await discoverEmojiList();
  }

  if (!list) {
    return NextResponse.json(
      {
        error: "not_found",
        message:
          "Não conseguimos descobrir o endpoint de emojis do atsu.moe automaticamente. " +
          "Passe o endpoint correto em { source: 'https://...' } ou use o import manual em /admin/emojis.",
      },
      { status: 404 },
    );
  }

  const results: { name: string; url: string }[] = [];
  const errors: { name: string; error: string }[] = [];

  await Promise.all(
    list.map(async (e) => {
      const key = e.name.replace(/[^a-z0-9_-]/g, "");
      if (!key) return;
      try {
        const r = await fetch(e.url, { headers: BROWSER_HEADERS });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const contentType = r.headers.get("content-type") ?? "image/png";
        const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "png";
        const bytes = new Uint8Array(await r.arrayBuffer());
        const added = await addEmoji(key, bytes, contentType, ext);
        results.push(added);
      } catch (err) {
        errors.push({ name: key, error: String(err) });
      }
    }),
  );

  return NextResponse.json({ added: results.length, errors });
}
