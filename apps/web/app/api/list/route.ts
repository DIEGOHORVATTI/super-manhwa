import { NextResponse } from "next/server";

import { browseNovels, searchNovels } from "@/lib/catalog";
import { parseBrowseState } from "@/lib/catalog/browse-state";

export async function GET(req: Request) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const state = parseBrowseState(params);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  try {
    const result =
      state.q.length >= 2
        ? await searchNovels(state.q, page)
        : await browseNovels({
            sort: state.sort,
            genre: state.genre || undefined,
            status: state.status || undefined,
            page,
          });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ list: [], hasNextPage: false });
  }
}
