import { and, asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { dbEnabled, getDb, schema } from "@/lib/db";
import { publicUrlFor } from "@/lib/r2";

type Params = Promise<{ slug: string }>;

async function loadWork(slug: string) {
  if (!dbEnabled) return null;
  const db = getDb();
  const { userWorks, userChapters, user } = schema;
  const [work] = await db
    .select({
      id: userWorks.id,
      title: userWorks.title,
      synopsis: userWorks.synopsis,
      coverR2Key: userWorks.coverR2Key,
      status: userWorks.status,
      ownerId: userWorks.ownerId,
      kind: userWorks.kind,
      categories: userWorks.categories,
    })
    .from(userWorks)
    .where(eq(userWorks.slug, slug))
    .limit(1);
  if (!work || work.status !== "published") return null;

  const [owner] = await db
    .select({ name: user.name, handle: user.handle })
    .from(user)
    .where(eq(user.id, work.ownerId))
    .limit(1);

  const chapters = await db
    .select({
      id: userChapters.id,
      number: userChapters.number,
      title: userChapters.title,
      publishedAt: userChapters.publishedAt,
    })
    .from(userChapters)
    .where(and(eq(userChapters.workId, work.id), eq(userChapters.status, "published")))
    .orderBy(asc(userChapters.number));

  return { work, owner, chapters };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadWork(slug);
  return { title: data?.work.title ?? "Obra" };
}

export default async function ObraPage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await loadWork(slug);
  if (!data) notFound();
  const { work, owner, chapters } = data;

  return (
    <div className="obra-wrap">
      <header className="obra-head">
        {work.coverR2Key && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="obra-cover" src={publicUrlFor(work.coverR2Key)} alt="" />
        )}
        <div>
          <h1 className="obra-title">{work.title}</h1>
          {owner && (
            <p className="muted">
              por{" "}
              {owner.handle ? <Link href={`/u/${owner.handle}`}>{owner.name}</Link> : owner.name}
            </p>
          )}
          {work.categories && work.categories.length > 0 && (
            <div className="obra-cats">
              {work.categories.map((c) => (
                <span key={c} className="obra-cat">
                  {c}
                </span>
              ))}
            </div>
          )}
          {work.synopsis && <p className="obra-synopsis">{work.synopsis}</p>}
        </div>
      </header>

      <h2 className="section">Capítulos</h2>
      {chapters.length === 0 ? (
        <p className="muted">Nenhum capítulo publicado ainda.</p>
      ) : (
        <ul className="obra-chapters">
          {chapters.map((c) => (
            <li key={c.id}>
              <Link href={work.kind === "novel" ? `/learn/${c.id}` : `/obra/${slug}/${c.id}`}>
                Cap. {c.number}
                {c.title ? ` — ${c.title}` : ""}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
