import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { getWorkAccess } from "@/lib/perms";
import { putObject, r2Enabled } from "@/lib/r2";

/**
 * Create a chapter and upload its page images to R2. Accepts multipart/form-data:
 *   number  (string)   — chapter number/label
 *   title   (string?)  — optional
 *   pages   (File[])   — ordered image files
 * Pages are stored at works/<workId>/ch/<chapterId>/<index>.<ext>; the chapter
 * starts as a draft.
 */
const MAX_PAGE_BYTES = 12 * 1024 * 1024;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!dbEnabled) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  if (!r2Enabled) return NextResponse.json({ error: "storage_unconfigured" }, { status: 503 });

  const session = await getServerSession();
  const workId = Number((await ctx.params).id);
  if (!Number.isInteger(workId))
    return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const access = await getWorkAccess(workId, session?.user?.id ?? null);
  if (!access.canEditChapters) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await req.formData();
  const number = String(form.get("number") ?? "").trim();
  const title = String(form.get("title") ?? "").trim() || null;
  const files = form.getAll("pages").filter((f): f is File => f instanceof File && f.size > 0);
  if (!number || files.length === 0) {
    return NextResponse.json({ error: "Informe o número e ao menos uma página." }, { status: 400 });
  }

  const db = getDb();
  const { userChapters, chapterPages } = schema;
  const [chapter] = await db
    .insert(userChapters)
    .values({ workId, number, title, status: "draft", createdBy: session!.user.id })
    .returning({ id: userChapters.id });

  let index = 0;
  for (const file of files) {
    if (file.size > MAX_PAGE_BYTES) continue;
    const ext = (file.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
    const key = `works/${workId}/ch/${chapter.id}/${index}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    await putObject(key, bytes, file.type || "image/jpeg");
    await db.insert(chapterPages).values({ chapterId: chapter.id, index, r2Key: key });
    index++;
  }

  return NextResponse.json({ chapter: { id: chapter.id, pages: index } }, { status: 201 });
}
