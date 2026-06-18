"use client";
import { useEffect, useRef, useState } from "react";

type Emoji = { name: string; url: string };

export function EmojiAdmin() {
  const [emojis, setEmojis] = useState<Emoji[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  // bulk import state
  const [bulkJson, setBulkJson] = useState("");

  // single upload state
  const [uploadName, setUploadName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const r = await fetch("/api/admin/emojis");
    if (r.ok) setEmojis((await r.json()).emojis ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(name: string) {
    if (!confirm(`Remover :${name}:?`)) return;
    await fetch(`/api/admin/emojis/${name}`, { method: "DELETE" });
    await load();
  }

  async function uploadOne() {
    const file = fileRef.current?.files?.[0];
    if (!file || !uploadName.trim()) {
      setMsg("Nome e arquivo são obrigatórios.");
      return;
    }
    setBusy(true);
    setMsg("");
    const form = new FormData();
    form.append("name", uploadName.trim());
    form.append("image", file);
    const r = await fetch("/api/admin/emojis", { method: "POST", body: form });
    setBusy(false);
    if (r.ok) {
      setMsg("Figurinha adicionada.");
      setUploadName("");
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } else {
      setMsg(`Erro: ${(await r.json()).error}`);
    }
  }

  async function bulkImport() {
    let parsed: { name: string; url: string }[];
    try {
      parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) throw new Error("array esperado");
    } catch (e) {
      setMsg(`JSON inválido: ${e}`);
      return;
    }
    setBusy(true);
    setMsg("Importando… aguarde.");
    const r = await fetch("/api/admin/emojis/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emojis: parsed }),
    });
    setBusy(false);
    const data = await r.json();
    setMsg(
      `Importadas: ${data.added}${data.errors?.length ? ` | Erros: ${data.errors.length}` : ""}`,
    );
    setBulkJson("");
    await load();
  }

  return (
    <div className="emoji-admin">
      <h2 className="section">Upload individual</h2>
      <div className="emoji-admin-form">
        <input
          className="input"
          value={uploadName}
          onChange={(e) => setUploadName(e.target.value)}
          placeholder="nome (ex: hype)"
        />
        <input ref={fileRef} type="file" accept="image/*" />
        <button type="button" disabled={busy} onClick={uploadOne}>
          Adicionar
        </button>
      </div>

      <h2 className="section" style={{ marginTop: 32 }}>
        Importar em massa (JSON)
      </h2>
      <p className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
        Cole um array <code>[{`{"name":"x","url":"https://..."}`}, …]</code> — as imagens são
        baixadas e salvas no R2.
      </p>
      <textarea
        className="input"
        rows={6}
        style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }}
        value={bulkJson}
        onChange={(e) => setBulkJson(e.target.value)}
        placeholder='[{"name":"hype","url":"https://..."}]'
      />
      <button type="button" disabled={busy || !bulkJson.trim()} onClick={bulkImport}>
        {busy ? "Importando…" : "Importar"}
      </button>

      {msg && <p style={{ marginTop: 8, fontSize: 13, color: "var(--accent)" }}>{msg}</p>}

      <h2 className="section" style={{ marginTop: 32 }}>
        Figurinhas ({emojis.length})
      </h2>
      {emojis.length === 0 ? (
        <p className="muted">Nenhuma figurinha cadastrada.</p>
      ) : (
        <div className="emoji-admin-grid">
          {emojis.map((e) => (
            <div key={e.name} className="emoji-admin-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={e.url} alt={e.name} />
              <span>:{e.name}:</span>
              <button type="button" className="ghost" onClick={() => remove(e.name)}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
