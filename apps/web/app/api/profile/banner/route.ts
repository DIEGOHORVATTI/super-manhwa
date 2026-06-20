import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { deleteObject, publicUrlFor, putObject, r2Enabled } from "@/lib/r2";

/** Upload/replace the signed-in user's profile banner (multipart `image`) → R2 → user.bannerR2Key.
 *  Client downscales to JPEG first; the cap is a safety net for the raw-fallback path. */
const MAX = 10 * 1024 * 1024;

export async function POST(req: Request) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  if (!r2Enabled) return NextResponse.json({ error: "storage_unconfigured" }, { status: 503 });
  const session = await getServerSession();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const form = await req.formData();
    const image = form.get("image");
    if (!(image instanceof File) || image.size === 0 || image.size > MAX) {
      return NextResponse.json({ error: "bad_image" }, { status: 400 });
    }
    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "not_an_image" }, { status: 400 });
    }

    const ext = (image.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
    // Unique key per upload so the public URL changes and caches don't serve the
    // old banner. The previous object is cleaned up below.
    const key = `users/${userId}/banner-${Date.now()}.${ext}`;
    await putObject(key, new Uint8Array(await image.arrayBuffer()), image.type || "image/jpeg");

    const db = getDb();
    const { user } = schema;
    const [prev] = await db
      .select({ bannerR2Key: user.bannerR2Key })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    await db
      .update(user)
      .set({ bannerR2Key: key, updatedAt: new Date() })
      .where(eq(user.id, userId));

    // Best-effort cleanup of the previous banner | fire-and-forget so a slow R2
    // delete never blocks the response. Skips the same-key overwrite case.
    if (prev?.bannerR2Key && prev.bannerR2Key !== key) {
      void deleteObject(prev.bannerR2Key).catch(() => {});
    }

    return NextResponse.json({ bannerUrl: publicUrlFor(key) });
  } catch (err) {
    console.error("[banner upload] failed:", err);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
