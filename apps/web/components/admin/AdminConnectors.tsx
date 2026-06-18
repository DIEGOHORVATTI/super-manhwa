"use client";
import { useCallback, useEffect, useState } from "react";

import { rpc } from "@/lib/rpc/client";

type Health = Awaited<ReturnType<typeof rpc.admin.connectors.list>>["connectors"][number];

/** Live reading-connector health (status + latency), probed on demand. */
export function AdminConnectors() {
  const [data, setData] = useState<Health[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await rpc.admin.connectors.list();
      setData(res.connectors);
    } catch {
      setData([]);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <div className="settings-title-row">
        <h1 className="settings-title">Conectores</h1>
        <button type="button" className="btn btn-ghost" onClick={load} disabled={busy}>
          {busy ? "Testando…" : "Re-testar"}
        </button>
      </div>

      {data === null ? (
        <p className="muted">Testando conectores… (pode levar alguns segundos)</p>
      ) : (
        <div className="admin-table">
          {data.map((c) => (
            <div key={c.id} className="admin-row">
              <div className="admin-row-main">
                <strong>{c.name}</strong>
                <span className="muted">
                  {c.langs.join(", ")}
                  {c.hasCloudflare ? " · Cloudflare" : ""}
                  {c.isNsfw ? " · NSFW" : ""}
                </span>
                <span className="muted">
                  {c.status === "up" ? `${c.latencyMs} ms · ${c.sample} itens` : "sem resposta"}
                </span>
              </div>
              <span
                className={`status-badge status-${c.status === "up" ? "published" : "rejected"}`}
              >
                {c.status === "up" ? "online" : "offline"}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
