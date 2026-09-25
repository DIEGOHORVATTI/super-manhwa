import Link from "next/link";

import { EmojiText } from "@/components/EmojiText";

type Comment = {
  id: number;
  body: string;
  score: number;
  createdAt: Date;
  href: string;
  targetTitle: string | null;
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
              <Link href={c.href} className="profile-comment-work">
                {c.targetTitle ?? "novel"}
              </Link>
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
