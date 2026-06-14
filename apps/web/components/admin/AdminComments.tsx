"use client";
import { useEffect, useState } from "react";

import { rpc } from "@/lib/rpc/client";

interface Row {
  id: number;
  body: string | null;
  targetType: string;
  targetId: string;
  deletedAt: string | Date | null;
  authorName: string | null;
  authorHandle: string | null;
}

/** Comment moderation: review recent comments and soft-delete offenders. */
export function AdminComments() {
  const [rows, setRows] = useState<Row[] | null>(null);

  async function load() {
    try {
      const { comments } = await rpc.admin.comments.list();
      setRows(comments ?? []);
    } catch {
      /* leave previous state */
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function remove(id: number) {
    try {
      await rpc.comments.remove({ id });
    } catch {
      /* ignore — load() refreshes truth */
    }
    await load();
  }

  if (!rows) return <p className="muted">Carregando…</p>;

  return (
    <>
      <h1 className="settings-title">Comentários</h1>
      <div className="admin-table">
        {rows.map((c) => (
          <div key={c.id} className={`admin-row${c.deletedAt ? " is-removed" : ""}`}>
            <div className="admin-row-main">
              <span className="muted">
                {c.authorName ?? "?"} · {c.targetType} {c.targetId}
              </span>
              <span>{c.deletedAt ? <em>removido</em> : c.body}</span>
            </div>
            {!c.deletedAt && (
              <button type="button" className="comment-link is-banned" onClick={() => remove(c.id)}>
                Excluir
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
