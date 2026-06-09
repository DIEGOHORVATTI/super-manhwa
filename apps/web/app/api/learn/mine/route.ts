import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { effectivePlan, entitlementsFor, type Plan } from "@/lib/learning/entitlements";
import { mineSentenceSchema } from "@/lib/schemas/learn";

/** Sentence mining — turn a real sentence into a review card. Premium feature. */
export async function POST(req: Request) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const u = session.user as { plan?: string; premiumUntil?: string | null };
  const plan = effectivePlan(
    (u.plan as Plan) ?? "free",
    u.premiumUntil ? new Date(u.premiumUntil) : null,
    new Date(),
  );
  if (!entitlementsFor(plan, { newWords: 0, reviews: 0 }).canMineSentences) {
    return NextResponse.json(
      { error: "premium_only", message: "Sentence mining é um recurso Premium." },
      { status: 402 },
    );
  }

  const parsed = mineSentenceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = getDb();
  const { sentences, srsCards } = schema;
  const [sent] = await db
    .select({ id: sentences.id, text: sentences.text })
    .from(sentences)
    .where(eq(sentences.id, parsed.data.sentenceId))
    .limit(1);
  if (!sent) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [card] = await db
    .insert(srsCards)
    .values({
      userId,
      type: "sentence",
      sentenceId: sent.id,
      front: sent.text,
      back: parsed.data.note,
    })
    .returning({ id: srsCards.id });

  return NextResponse.json({ card }, { status: 201 });
}
