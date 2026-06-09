"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/Icon";
import { useSession } from "@/lib/auth/client";
import { buildCommentTree } from "@/lib/comment-tree";

/**
 * Native threaded comments (replaces Disqus). Lists a work's or chapter's
 * comments, lets signed-in users post/reply/edit/delete and vote. Anonymous
 * visitors see the thread plus a "sign in to comment" CTA. One reply level.
 */
type Target = "work" | "chapter";

interface Comment {
  id: number;
  parentId: number | null;
  body: string | null;
  score: number;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  userId: string;
  authorName: string | null;
  authorImage: string | null;
  authorHandle: string | null;
  mine: boolean;
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} d`;
}

export function Comments({ targetType, targetId }: { targetType: Target; targetId: string }) {
  const { data: session } = useSession();
  const me = session?.user;
  const [items, setItems] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/comments?targetType=${targetType}&targetId=${encodeURIComponent(targetId)}`,
    );
    const json = await res.json();
    setItems(json.comments ?? []);
  }, [targetType, targetId]);

  useEffect(() => {
    void load();
  }, [load]);

  const tree = useMemo(() => buildCommentTree(items ?? []), [items]);

  async function submit(text: string, parentId: number | null) {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetType, targetId, parentId, body: text }),
      });
      setBody("");
      setReplyTo(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: number, text: string) {
    await fetch(`/api/comments/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    setEditing(null);
    await load();
  }

  async function remove(id: number) {
    await fetch(`/api/comments/${id}`, { method: "DELETE" });
    await load();
  }

  async function vote(id: number, value: number) {
    if (!me) return;
    await fetch(`/api/comments/${id}/vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value }),
    });
    await load();
  }

  const count = (items ?? []).filter((c) => !c.deletedAt).length;

  function Row({ c, isReply }: { c: Comment; isReply?: boolean }) {
    const [draft, setDraft] = useState(c.body ?? "");
    const [reply, setReply] = useState("");
    const removed = Boolean(c.deletedAt);
    return (
      <div className={`comment${isReply ? " comment-reply" : ""}`}>
        <div className="comment-avatar">
          {c.authorImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.authorImage} alt="" />
          ) : (
            <span>{(c.authorName ?? "?").charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="comment-main">
          <div className="comment-head">
            <span className="comment-author">{c.authorName ?? "Usuário"}</span>
            <span className="comment-time">{timeAgo(c.createdAt)}</span>
            {c.editedAt && <span className="comment-time">(editado)</span>}
          </div>

          {editing === c.id ? (
            <div className="comment-editor">
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} />
              <div className="comment-editor-actions">
                <button type="button" onClick={() => saveEdit(c.id, draft)}>
                  Salvar
                </button>
                <button type="button" className="ghost" onClick={() => setEditing(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p className="comment-body">{removed ? <em>comentário removido</em> : c.body}</p>
          )}

          {!removed && (
            <div className="comment-actions">
              <button type="button" className="comment-vote" onClick={() => vote(c.id, 1)}>
                <Icon name="chevron-up" size={15} />
              </button>
              <span className="comment-score">{c.score}</span>
              <button type="button" className="comment-vote" onClick={() => vote(c.id, -1)}>
                <Icon name="chevron-down" size={15} />
              </button>
              {!isReply && me && (
                <button
                  type="button"
                  className="comment-link"
                  onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                >
                  Responder
                </button>
              )}
              {c.mine && (
                <>
                  <button type="button" className="comment-link" onClick={() => setEditing(c.id)}>
                    Editar
                  </button>
                  <button type="button" className="comment-link" onClick={() => remove(c.id)}>
                    Excluir
                  </button>
                </>
              )}
            </div>
          )}

          {replyTo === c.id && (
            <div className="comment-editor">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                placeholder="Escreva uma resposta…"
              />
              <div className="comment-editor-actions">
                <button type="button" disabled={busy} onClick={() => submit(reply, c.id)}>
                  Responder
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="comments">
      <h2 className="section">
        Comentários {count > 0 && <span className="muted">({count})</span>}
      </h2>

      {me ? (
        <div className="comment-composer">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Adicione um comentário…"
          />
          <button type="button" disabled={busy || !body.trim()} onClick={() => submit(body, null)}>
            {busy ? "Enviando…" : "Comentar"}
          </button>
        </div>
      ) : (
        <div className="comment-signin">
          <Icon name="log-in" size={16} />
          <span>
            <Link href="/login">Entre</Link> para comentar.
          </span>
        </div>
      )}

      {items === null ? (
        <p className="muted">Carregando…</p>
      ) : tree.length === 0 ? (
        <p className="muted">Seja o primeiro a comentar.</p>
      ) : (
        <div className="comment-list">
          {tree.map((c) => (
            <div key={c.id}>
              <Row c={c} />
              {c.replies.map((r) => (
                <Row key={r.id} c={r} isReply />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
