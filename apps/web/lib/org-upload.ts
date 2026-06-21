import "server-only";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { deleteObject, publicUrlFor, putObject, r2Enabled } from "@/lib/r2";

/** Org logo/banner upload (owner-only, multipart `image`) → R2 → teams.*R2Key.
 *  Shared by the avatar + banner route handlers. The client downscales to JPEG
 *  first; the cap is a safety net for the raw-fallback path. */
const MAX = 10 * 1024 * 1024;

export async function uploadOrgImage(
  req: Request,
  idStr: string,
  field: "avatar" | "banner",
): Promise<Response> {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  if (!r2Enabled) return NextResponse.json({ error: "storage_unconfigured" }, { status: 503 });
  const session = await getServerSession();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = Number(idStr);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }

  const db = getDb();
  const { teams } = schema;
  const [team] = await db
    .select({
      ownerId: teams.ownerId,
      avatarR2Key: teams.avatarR2Key,
      bannerR2Key: teams.bannerR2Key,
    })
    .from(teams)
    .where(eq(teams.id, id))
    .limit(1);
  if (!team) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (team.ownerId !== userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

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
    // old image. The previous object is cleaned up below.
    const key = `orgs/${id}/${field}-${Date.now()}.${ext}`;
    await putObject(key, new Uint8Array(await image.arrayBuffer()), image.type || "image/jpeg");

    const prevKey = field === "avatar" ? team.avatarR2Key : team.bannerR2Key;
    await db
      .update(teams)
      .set(field === "avatar" ? { avatarR2Key: key } : { bannerR2Key: key })
      .where(eq(teams.id, id));

    if (prevKey && prevKey !== key) void deleteObject(prevKey).catch(() => {});
    return NextResponse.json({ url: publicUrlFor(key) });
  } catch (err) {
    console.error(`[org ${field} upload] failed:`, err);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
