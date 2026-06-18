import Link from "next/link";

import { EmojiText } from "@/components/EmojiText";
import { routes } from "@/lib/routes";

type Comment = {
  id: number;
  body: string;
  score: number;
  createdAt: Date;
  workId: string | null;
  workTitle: string | null;
};

const when = (d: Date) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

/** The user's recent comments (atsu-style), linking to the work when resolved. */
export function ProfileComments({ comments }: { comments: Comment[] }) {
  if (comments.length === 0) return null;
  return (
    <section className="profile-section">
      <h2 className="section">Comentários</h2>
      <ul className="profile-comments">
        {comments.map((c) => (
          <li key={c.id} className="profile-comment">
            <div className="profile-comment-head">
              {c.workId && c.workTitle ? (
                <Link href={routes.manga(c.workId, c.workTitle)} className="profile-comment-work">
                  {c.workTitle}
                </Link>
              ) : (
                <span className="muted">{c.workTitle ?? "obra"}</span>
              )}
              <span className="profile-comment-meta">
                ▲ {c.score} · {when(c.createdAt)}
              </span>
            </div>
            <EmojiText text={c.body} className="profile-comment-body" />
          </li>
        ))}
      </ul>
    </section>
  );
}
