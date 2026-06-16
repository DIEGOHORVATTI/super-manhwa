import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { publicUrlFor, putObject, r2Enabled } from "@/lib/r2";

/** Upload/replace the signed-in user's profile banner (multipart `image`) → R2 → user.bannerR2Key. */
const MAX = 6 * 1024 * 1024;

export async function POST(req: Request) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  if (!r2Enabled) return NextResponse.json({ error: "storage_unconfigured" }, { status: 503 });
  const session = await getServerSession();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const image = form.get("image");
  if (!(image instanceof File) || image.size === 0 || image.size > MAX) {
    return NextResponse.json({ error: "bad_image" }, { status: 400 });
  }

  const ext = (image.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
  const key = `users/${userId}/banner.${ext}`;
  await putObject(key, new Uint8Array(await image.arrayBuffer()), image.type || "image/jpeg");

  const db = getDb();
  const { user } = schema;
  await db.update(user).set({ bannerR2Key: key, updatedAt: new Date() }).where(eq(user.id, userId));

  return NextResponse.json({ bannerUrl: publicUrlFor(key) });
}
