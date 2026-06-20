"use client";
import { useCallback, useEffect, useState } from "react";

import { EmojiText } from "@/components/EmojiText";
import { Button } from "@/components/ui/Button";
import { rpc } from "@/lib/rpc/client";

interface Row {
  id: number;
  body: string | null;
  targetType: string;
  targetId: string;
  deletedAt: string | Date | null;
  authorName: string | null;
  authorHandle: string | null;
  workTitle: string | null;
}

const PAGE = 50;

/** Comment moderation: review comments (with emotes + work) and soft-delete. */
export function AdminComments() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const load = useCallback(async () => {
    try {
      const { comments, total } = await rpc.admin.comments.list({ limit: PAGE, offset });
      setRows(comments ?? []);
      setTotal(total ?? 0);
    } catch {
      /* leave previous state */
    }
  }, [offset]);
  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: number) {
    try {
      await rpc.comments.remove({ id });
    } catch {
      /* ignore | load() refreshes truth */
    }
    await load();
  }

  if (!rows) return <p className="muted">Carregando…</p>;

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE, total);

  return (
    <>
      <header className="admin-page-head">
        <h1 className="settings-title">Comentários</h1>
        <p className="muted">{total} comentários no total.</p>
      </header>

      <div className="admin-table">
        {rows.map((c) => (
          <div key={c.id} className={`admin-row${c.deletedAt ? " is-removed" : ""}`}>
            <div className="admin-row-main">
              <span className="muted">
                {c.authorName ?? "?"}
                {c.workTitle ? (
                  <>
                    {" "}
                    · em <strong>{c.workTitle}</strong>
                  </>
                ) : (
                  <> · {c.targetType}</>
                )}
              </span>
              <span>{c.deletedAt ? <em>removido</em> : <EmojiText text={c.body ?? ""} />}</span>
            </div>
            {!c.deletedAt && (
              <Button variant="danger" size="sm" icon="x" onClick={() => remove(c.id)}>
                Excluir
              </Button>
            )}
          </div>
        ))}
      </div>

      {total > PAGE && (
        <div className="admin-pager">
          <Button
            variant="ghost"
            size="sm"
            icon="chevron-left"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE))}
          >
            Anterior
          </Button>
          <span className="muted">
            {from}–{to} de {total}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={to >= total}
            onClick={() => setOffset(offset + PAGE)}
          >
            Próximos
          </Button>
        </div>
      )}
    </>
  );
}
