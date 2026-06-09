"use client";
import { useEffect, useState } from "react";

interface Row {
  id: number;
  body: string | null;
  targetType: string;
  targetId: string;
  deletedAt: string | null;
  authorName: string | null;
  authorHandle: string | null;
}

/** Comment moderation: review recent comments and soft-delete offenders. */
export function AdminComments() {
  const [rows, setRows] = useState<Row[] | null>(null);

  async function load() {
    const res = await fetch("/api/admin/comments");
    if (res.ok) setRows((await res.json()).comments ?? []);
  }
  useEffect(() => {
    void load();
  }, []);

  async function remove(id: number) {
    await fetch(`/api/comments/${id}`, { method: "DELETE" });
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
