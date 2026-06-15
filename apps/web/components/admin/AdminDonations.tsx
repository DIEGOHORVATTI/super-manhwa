"use client";
import { useEffect, useState } from "react";

import { rpc } from "@/lib/rpc/client";

interface Row {
  id: number;
  amountCents: number;
  status: string;
  message: string | null;
  createdAt: string | Date;
}

const brl = (cents: number) => `R$${(cents / 100).toFixed(2)}`;

/** Donation history + approved total. */
export function AdminDonations() {
  const [data, setData] = useState<{ donations: Row[]; totalApprovedCents: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await rpc.admin.donations.list();
        setData(res);
      } catch {
        /* leave loading state */
      }
    })();
  }, []);

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
              <strong>{brl(d.amountCents)}</strong>
              {d.message && <span className="muted">{d.message}</span>}
              <span className="muted">{new Date(d.createdAt).toLocaleString("pt-BR")}</span>
            </div>
            <span
              className={`status-badge status-${d.status === "approved" ? "published" : d.status}`}
            >
              {d.status}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
