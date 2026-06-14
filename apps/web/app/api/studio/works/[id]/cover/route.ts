import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { getWorkAccess } from "@/lib/perms";
import { publicUrlFor, putObject, r2Enabled } from "@/lib/r2";

/** Upload/replace a work's cover (multipart `image`) → R2 → userWorks.coverR2Key. */
const MAX = 6 * 1024 * 1024;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  if (!r2Enabled) return NextResponse.json({ error: "storage_unconfigured" }, { status: 503 });
  const session = await getServerSession();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const access = await getWorkAccess(id, session?.user?.id ?? null);
  if (!access.canEditWork) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await req.formData();
  const image = form.get("image");
  if (!(image instanceof File) || image.size === 0 || image.size > MAX) {
    return NextResponse.json({ error: "bad_image" }, { status: 400 });
  }

  const ext = (image.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
  const key = `works/${id}/cover.${ext}`;
  await putObject(key, new Uint8Array(await image.arrayBuffer()), image.type || "image/jpeg");

  const db = getDb();
  const { userWorks } = schema;
  await db.update(userWorks).set({ coverR2Key: key }).where(eq(userWorks.id, id));

  return NextResponse.json({ coverUrl: publicUrlFor(key) });
}
