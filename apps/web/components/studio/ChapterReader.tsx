"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

interface PageData {
  index: number;
  url: string;
}

/**
 * Vertical image reader for user-uploaded chapters (R2-hosted). Used by the
 * studio preview (any status, team-gated) and the public reader (published).
 */
export function ChapterReader({
  chapterId,
  backHref,
  preview = false,
}: {
  chapterId: number;
  backHref: string;
  preview?: boolean;
}) {
  const [data, setData] = useState<{
    chapter: { number: string; title: string | null; status: string };
    pages: PageData[];
  } | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/studio/chapters/${chapterId}/pages`);
      if (res.ok) setData(await res.json());
      else setErr(true);
    })();
  }, [chapterId]);

  if (err) return <p className="muted studio-wrap">Capítulo indisponível.</p>;
  if (!data) return <p className="muted studio-wrap">Carregando…</p>;

  return (
    <div className="user-reader">
      <div className="user-reader-bar">
        <Link href={backHref} className="comment-link">
          ← Voltar
        </Link>
        <span>
          Cap. {data.chapter.number}
          {data.chapter.title ? ` | ${data.chapter.title}` : ""}
        </span>
        {preview && <span className="status-badge status-draft">{data.chapter.status}</span>}
      </div>
      <div className="user-reader-pages">
        {data.pages.map((p) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={p.index} src={p.url} alt={`Página ${p.index + 1}`} loading="lazy" />
        ))}
      </div>
    </div>
  );
}
