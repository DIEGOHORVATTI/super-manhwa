"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { BadgeChip } from "@/components/Badge";
import { ComposerArea } from "@/components/ComposerArea";
import { Icon } from "@/components/Icon";
import { useSession } from "@/lib/auth/client";
import { chatBadges } from "@/lib/badges";
import { buildCommentTree, type WithReplies } from "@/lib/comment-tree";
import { fetchEmojiMap } from "@/lib/emoji-client";
import { parseBody } from "@/lib/emojis";
import { routes } from "@/lib/routes";
import { rpc } from "@/lib/rpc/client";

type Target = "work" | "chapter";
type Comment = Awaited<ReturnType<typeof rpc.comments.list>>["comments"][number];

function timeAgo(iso: string | Date): string {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} d`;
}

function CommentBody({ text, emojiMap }: { text: string; emojiMap: Record<string, string> }) {
  const segments = parseBody(text.trim(), emojiMap);
  const solo = segments.length === 1 && typeof segments[0] !== "string" ? segments[0] : null;

  if (solo) {
    return (
      <p className="comment-body">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={solo.url}
          alt={`:${solo.name}:`}
          title={`:${solo.name}:`}
          className="comment-emoji-solo"
        />
      </p>
    );
  }

  return (
    <p className="comment-body">
      {segments.map((seg, i) =>
        typeof seg === "string" ? (
          seg
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={seg.url}
            alt={`:${seg.name}:`}
            title={`:${seg.name}:`}
            className="comment-emoji"
          />
        ),
      )}
    </p>
  );
}

export function Comments({ targetType, targetId }: { targetType: Target; targetId: string }) {
  const { data: session } = useSession();
  const me = session?.user;
  const [items, setItems] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [emojiMap, setEmojiMap] = useState<Record<string, string>>({});

  useEffect(() => {
    void fetchEmojiMap().then(setEmojiMap);
  }, []);

  const load = useCallback(async () => {
    const json = await rpc.comments.list({ targetType, targetId });
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
      await rpc.comments.create({ targetType, targetId, parentId, body: text });
      setBody("");
      setReplyTo(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: number, text: string) {
    await rpc.comments.edit({ id, body: text });
    setEditing(null);
    await load();
  }

  async function remove(id: number) {
    await rpc.comments.remove({ id });
    await load();
  }

  async function vote(id: number, value: number) {
    if (!me) return;
    await rpc.comments.vote({ id, value });
    await load();
  }

  const count = (items ?? []).filter((c) => !c.deletedAt).length;

  function Row({ c, depth = 0 }: { c: WithReplies<Comment>; depth?: number }) {
    const [draft, setDraft] = useState(c.body ?? "");
    const [reply, setReply] = useState("");
    const removed = Boolean(c.deletedAt);
    return (
      <>
        <div className={`comment${depth > 0 ? " comment-reply" : ""}`}>
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
              {chatBadges({ role: c.authorRole, plan: c.authorPlan }).map((b) => (
                <BadgeChip key={b.key} b={b} />
              ))}
              {(c.authorTags ?? []).map((t) => (
                <BadgeChip
                  key={t.key}
                  b={{
                    key: t.key,
                    label: t.label,
                    tone: "special",
                    emoteUrl: t.emoteUrl ?? undefined,
                    color: t.color ?? undefined,
                  }}
                />
              ))}
              <span className="comment-time">{timeAgo(c.createdAt)}</span>
              {c.editedAt && <span className="comment-time">(editado)</span>}
            </div>

            {editing === c.id ? (
              <div className="comment-editor">
                <ComposerArea value={draft} onChange={setDraft} rows={3} />
                <div className="comment-editor-actions">
                  <button type="button" onClick={() => saveEdit(c.id, draft)}>
                    Salvar
                  </button>
                  <button type="button" className="ghost" onClick={() => setEditing(null)}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : removed ? (
              <p className="comment-body">
                <em>comentário removido</em>
              </p>
            ) : (
              <CommentBody text={c.body ?? ""} emojiMap={emojiMap} />
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
                {me && (
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
                <ComposerArea
                  value={reply}
                  onChange={setReply}
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
        {c.replies.length > 0 && (
          <div className="comment-replies">
            {c.replies.map((r) => (
              <Row key={r.id} c={r} depth={depth + 1} />
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <section className="comments">
      <h2 className="section">
        Comentários {count > 0 && <span className="muted">({count})</span>}
      </h2>

      {me ? (
        <div className="comment-composer">
          <ComposerArea
            value={body}
            onChange={setBody}
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
            <Link href={routes.login}>Entre</Link> para comentar.
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
            <Row key={c.id} c={c} depth={0} />
          ))}
        </div>
      )}
    </section>
  );
}
