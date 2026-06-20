import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { deleteObject, keyFromPublicUrl, publicUrlFor, putObject, r2Enabled } from "@/lib/r2";

/** Upload/replace the signed-in user's avatar (multipart `image`) → R2 → user.image.
 *  The client downscales to JPEG first; the generous cap is a safety net for the
 *  raw-fallback path (a format the browser couldn't re-encode). */
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
    // Unique key per upload | a stable key would keep the same public URL, so the
    // browser (and CDN) would serve the cached old image. The previous object is
    // cleaned up below.
    const key = `users/${userId}/avatar-${Date.now()}.${ext}`;
    await putObject(key, new Uint8Array(await image.arrayBuffer()), image.type || "image/jpeg");

    const db = getDb();
    const { user } = schema;
    const [prev] = await db
      .select({ image: user.image })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    const url = publicUrlFor(key);
    await db.update(user).set({ image: url, updatedAt: new Date() }).where(eq(user.id, userId));

    // Best-effort cleanup of the replaced object | fire-and-forget so a slow R2
    // delete never blocks the upload response. Skips external/AniList avatars and
    // the same-key overwrite case.
    const oldKey = prev?.image ? keyFromPublicUrl(prev.image) : null;
    if (oldKey && oldKey !== key) void deleteObject(oldKey).catch(() => {});

    return NextResponse.json({ avatarUrl: url });
  } catch (err) {
    console.error("[avatar upload] failed:", err);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
