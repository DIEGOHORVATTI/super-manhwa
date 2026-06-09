"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useSession } from "@/lib/auth/client";

interface Work {
  id: number;
  title: string;
  slug: string;
  status: string;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  pending: "Pendente",
  published: "Publicada",
};

/** Studio home: list works the user owns/collaborates on + create a new one. */
export function StudioDashboard() {
  const { data: session, isPending } = useSession();
  const [works, setWorks] = useState<Work[] | null>(null);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    const res = await fetch("/api/studio/works");
    if (res.ok) setWorks((await res.json()).works ?? []);
  }
  useEffect(() => {
    if (session) void load();
  }, [session]);

  if (isPending) return <p className="muted studio-wrap">Carregando…</p>;
  if (!session?.user) {
    return (
      <div className="studio-wrap">
        <p className="muted">
          <Link href="/login">Entre</Link> para publicar e gerenciar suas obras.
        </p>
      </div>
    );
  }

  async function create() {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/studio/works", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        setTitle("");
        await load();
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="studio-wrap">
      <h1 className="settings-title">Studio</h1>

      <section className="settings-card">
        <h2>Nova obra</h2>
        <label className="auth-field">
          <span>Título</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome da obra" />
        </label>
        <button type="button" className="auth-submit" onClick={create} disabled={creating}>
          {creating ? "Criando…" : "Criar obra"}
        </button>
      </section>

      <h2 className="section">Minhas obras</h2>
      {works === null ? (
        <p className="muted">Carregando…</p>
      ) : works.length === 0 ? (
        <p className="muted">Você ainda não tem obras. Crie a primeira acima.</p>
      ) : (
        <div className="studio-works">
          {works.map((w) => (
            <Link key={w.id} href={`/studio/${w.id}`} className="studio-work-card">
              <strong>{w.title}</strong>
              <span className={`status-badge status-${w.status}`}>
                {STATUS_LABEL[w.status] ?? w.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
