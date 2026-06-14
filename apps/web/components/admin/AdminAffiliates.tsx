"use client";
import { useEffect, useState } from "react";

interface Row {
  id: number;
  code: string;
  pixKey: string | null;
  name: string | null;
  handle: string | null;
  pendingCents: number;
}

const brl = (cents: number) => `R$${(cents / 100).toFixed(2)}`;

/** Affiliate payouts: see pending commission per affiliate and mark as paid. */
export function AdminAffiliates() {
  const [rows, setRows] = useState<Row[] | null>(null);

  async function load() {
    const res = await fetch("/api/admin/affiliates");
    if (res.ok) setRows((await res.json()).affiliates ?? []);
  }
  useEffect(() => {
    void load();
  }, []);

  async function pay(affiliateId: number) {
    await fetch("/api/admin/affiliates", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ affiliateId }),
    });
    await load();
  }

  if (!rows) return <p className="muted">Carregando…</p>;

  return (
    <>
      <h1 className="settings-title">Afiliados</h1>
      <div className="admin-table">
        {rows.length === 0 && <p className="muted">Nenhum afiliado ainda.</p>}
        {rows.map((r) => (
          <div key={r.id} className="admin-row">
            <div className="admin-row-main">
              <strong>{r.name ?? r.code}</strong>
              <span className="muted">
                /?ref={r.code} · Pix: {r.pixKey || "—"}
              </span>
              <span className="muted">A pagar: {brl(r.pendingCents)}</span>
            </div>
            <button
              type="button"
              className="comment-link"
              disabled={r.pendingCents <= 0}
              onClick={() => pay(r.id)}
            >
              Marcar pago
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
