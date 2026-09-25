import { NextResponse } from "next/server";

import { suggestNovels } from "@/lib/catalog";

export async function GET(req: Request) {
  const query = (new URL(req.url).searchParams.get("q") ?? "").trim();
  if (query.length < 2) return NextResponse.json({ list: [] });

  const list = await suggestNovels(query).catch(() => []);
  return NextResponse.json({ list }, { headers: { "Cache-Control": "public, s-maxage=600" } });
}
