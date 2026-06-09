import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { effectivePlan, entitlementsFor, type Plan } from "@/lib/learning/entitlements";

/**
 * Export the user's review cards as a tab-separated file Anki imports natively
 * (Import File → field 1 = Front, field 2 = Back). Premium-only. A zipped .apkg
 * is a future enhancement; TSV covers the high-value "take my cards to Anki" need.
 */
export async function GET() {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const u = session.user as { plan?: string; premiumUntil?: string | null };
  const plan = effectivePlan(
    (u.plan as Plan) ?? "free",
    u.premiumUntil ? new Date(u.premiumUntil) : null,
    new Date(),
  );
  if (!entitlementsFor(plan, { newWords: 0, reviews: 0 }).canExportAnki) {
    return NextResponse.json({ error: "premium_only" }, { status: 402 });
  }

  const db = getDb();
  const { srsCards } = schema;
  const cards = await db
    .select({ front: srsCards.front, back: srsCards.back })
    .from(srsCards)
    .where(eq(srsCards.userId, session.user.id));

  const esc = (s: string) => s.replace(/\t/g, " ").replace(/\r?\n/g, " ");
  const tsv = cards.map((c) => `${esc(c.front)}\t${esc(c.back)}`).join("\n");

  return new NextResponse(tsv, {
    headers: {
      "content-type": "text/tab-separated-values; charset=utf-8",
      "content-disposition": 'attachment; filename="super-manhwa-anki.tsv"',
    },
  });
}
