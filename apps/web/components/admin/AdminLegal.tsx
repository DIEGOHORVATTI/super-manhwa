"use client";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { rpc } from "@/lib/rpc/client";

interface Row {
  id: number;
  type: string;
  createdAt: string | Date;
  fields: Record<string, unknown>;
}

const LABELS: Record<string, string> = {
  name: "Nome",
  email: "E-mail",
  work: "Obra",
  urls: "URLs",
  details: "Detalhes",
  subject: "Assunto",
  message: "Mensagem",
  goodFaith: "Boa-fé",
  accurate: "Veracidade",
};

const fmt = (v: unknown) => (typeof v === "boolean" ? (v ? "sim" : "não") : String(v ?? ""));

/** DMCA takedowns + contact messages | read-only inbox with cleanup. */
export function AdminLegal() {
  const [rows, setRows] = useState<Row[] | null>(null);

  const load = useCallback(async () => {
    try {
      const { requests } = await rpc.admin.legal.list();
      setRows(requests ?? []);
    } catch {
      /* keep state */
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: number) {
    if (!confirm("Excluir este pedido?")) return;
    try {
      await rpc.admin.legal.remove({ id });
    } catch {
      /* ignore */
    }
    void load();
  }

  if (!rows) return <p className="muted">Carregando…</p>;
  if (rows.length === 0) return <p className="muted">Nenhum pedido recebido.</p>;

  return (
    <>
      <h1 className="settings-title">DMCA / Contato</h1>
      <div className="admin-table">
        {rows.map((r) => (
          <div key={r.id} className="admin-row">
            <div className="admin-row-main">
              <span className={`badge badge-${r.type === "dmca" ? "admin" : "staff"}`}>
                {r.type === "dmca" ? "DMCA" : "Contato"}
              </span>
              <span className="muted">{new Date(r.createdAt).toLocaleString("pt-BR")}</span>
              <dl className="admin-legal-fields">
                {Object.entries(r.fields).map(([k, v]) => (
                  <div key={k}>
                    <dt>{LABELS[k] ?? k}</dt>
                    <dd>{fmt(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="admin-row-actions">
              <Button variant="danger" size="sm" icon="x" onClick={() => remove(r.id)}>
                Excluir
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
