import type { MangaSort, MangaStatus } from "@packages/contracts";
import { NextResponse } from "next/server";

import { api, apiFresh } from "@/lib/orpc.server";
import { translateSummaries } from "@/lib/translate";

/**
 * Paginated listing endpoint for the client-side infinite scroll. Mirrors the
 * server pages' data logic so subsequent pages can be fetched in the browser:
 * text search (q≥2) or browse by sort/genre/status. Returns the same
 * `{ list, hasNextPage }` shape as the oRPC routes.
 */
const SORTS: ReadonlyArray<MangaSort> = ["popular", "trending", "newest"];
const STATUSES: ReadonlyArray<MangaStatus> = ["ongoing", "completed", "hiatus", "cancelled"];

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1);

  try {
    const q = (sp.get("q") ?? "").trim();
    const genre = sp.get("genre") || undefined;
    const status = STATUSES.includes(sp.get("status") as MangaStatus)
      ? (sp.get("status") as MangaStatus)
      : undefined;
    const sort: MangaSort = SORTS.includes(sp.get("sort") as MangaSort)
      ? (sp.get("sort") as MangaSort)
      : "popular";
    const fmt = sp.get("format");
    const format = fmt === "novel" || fmt === "manga" ? (fmt as "novel" | "manga") : undefined;

    const browseArgs = { lang: "pt-br", genre, status, sort, format, page };
    let r =
      q.length >= 2
        ? await api.manga.search({ lang: "pt-br", q, genre, status, page })
        : await api.manga.popular(browseArgs);
    // Self-heal a transient empty pinned by the 6h catalog cache (browse only).
    if (q.length < 2 && r.list.length === 0) {
      r = await apiFresh.manga.popular(browseArgs).catch(() => r);
    }
    return NextResponse.json({
      list: await translateSummaries(r.list),
      hasNextPage: r.hasNextPage,
    });
  } catch {
    return NextResponse.json({ list: [], hasNextPage: false });
  }
}
