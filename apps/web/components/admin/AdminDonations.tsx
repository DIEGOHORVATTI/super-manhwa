"use client";
import { useCallback, useEffect, useState } from "react";

import { rpc } from "@/lib/rpc/client";

interface Row {
  id: number;
  amountCents: number;
  status: string;
  message: string | null;
  displayName: string | null;
  hidden: boolean;
  createdAt: string | Date;
}

const brl = (cents: number) => `R$${(cents / 100).toFixed(2)}`;

/** Donation history + approved total, with hide/delete moderation. */
export function AdminDonations() {
  const [data, setData] = useState<{ donations: Row[]; totalApprovedCents: number } | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await rpc.admin.donations.list());
    } catch {
      /* leave loading state */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleHide(id: number, hidden: boolean) {
    await rpc.admin.donations.hide({ id, hidden });
    void load();
  }
  async function remove(id: number) {
    if (!confirm("Excluir esta doação?")) return;
    await rpc.admin.donations.remove({ id });
    void load();
  }

  if (!data) return <p className="muted">Carregando…</p>;

  return (
    <>
      <h1 className="settings-title">Doações</h1>
      <div className="settings-card">
        <h2>Total confirmado</h2>
        <p style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{brl(data.totalApprovedCents)}</p>
      </div>
      <div className="admin-table">
        {data.donations.map((d) => (
          <div key={d.id} className="admin-row">
            <div className="admin-row-main">
              <strong>
                {brl(d.amountCents)}
                {d.displayName ? ` · ${d.displayName}` : ""}
              </strong>
              {d.message && <span className="muted">{d.message}</span>}
              <span className="muted">{new Date(d.createdAt).toLocaleString("pt-BR")}</span>
            </div>
            <span
              className={`status-badge status-${d.status === "approved" ? "published" : d.status}`}
            >
              {d.status}
            </span>
            <div className="admin-row-actions">
              {d.status === "approved" && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => toggleHide(d.id, !d.hidden)}
                >
                  {d.hidden ? "Mostrar" : "Ocultar"}
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={() => remove(d.id)}>
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
