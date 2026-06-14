"use client";
import { useEffect, useState } from "react";

import { rpc } from "@/lib/rpc/client";

interface Block {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  linkUrl: string | null;
  title: string | null;
  imageUrl: string | null;
}

/** Moderate paid pixel blocks before they show on the public board. */
export function AdminPixels() {
  const [blocks, setBlocks] = useState<Block[] | null>(null);

  async function load() {
    try {
      const { blocks } = await rpc.admin.pixels.list();
      setBlocks(blocks ?? []);
    } catch {
      /* leave previous state */
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function moderate(id: number, action: "approve" | "reject") {
    try {
      await rpc.admin.pixels.moderate({ id, action });
    } catch {
      /* ignore — load() refreshes truth */
    }
    await load();
  }

  if (!blocks) return <p className="muted">Carregando…</p>;

  return (
    <>
      <h1 className="settings-title">Pixels — moderação</h1>
      {blocks.length === 0 && <p className="muted">Nada pendente.</p>}
      <div className="admin-table">
        {blocks.map((b) => (
          <div key={b.id} className="admin-row">
            <div
              className="admin-row-main"
              style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
            >
              {b.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.imageUrl}
                  alt=""
                  style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8 }}
                />
              )}
              <div className="admin-row-main">
                <strong>{b.title || `${b.w}×${b.h}`}</strong>
                <span className="muted">{b.linkUrl}</span>
                <span className="muted">
                  pos {b.x},{b.y} · {b.w}×{b.h}
                </span>
              </div>
            </div>
            <div className="admin-row-actions">
              <button
                type="button"
                className="comment-link"
                onClick={() => moderate(b.id, "approve")}
              >
                Aprovar
              </button>
              <button
                type="button"
                className="comment-link is-banned"
                onClick={() => moderate(b.id, "reject")}
              >
                Rejeitar
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
