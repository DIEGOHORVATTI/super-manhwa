"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useSession } from "@/lib/auth/client";
import { rpc } from "@/lib/rpc/client";

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
  const [kind, setKind] = useState<"manga" | "novel">("manga");
  const [language, setLanguage] = useState<"pt" | "en">("pt");
  const [categories, setCategories] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      const { works } = await rpc.studio.works.list();
      setWorks(works ?? []);
    } catch {
      setWorks([]);
    }
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
      const cats = categories
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
        .slice(0, 8);
      await rpc.studio.works.create({
        title,
        kind,
        language: kind === "novel" ? language : undefined,
        categories: cats.length ? cats : undefined,
      });
      setTitle("");
      setCategories("");
      await load();
    } catch {
      // creation failed — leave the form as-is so the user can retry.
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
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nome da obra"
          />
        </label>
        <div className="studio-upload-row">
          <label className="auth-field">
            <span>Tipo</span>
            <select
              className="select"
              value={kind}
              onChange={(e) => setKind(e.target.value as "manga" | "novel")}
            >
              <option value="manga">Mangá (imagem)</option>
              <option value="novel">Novel (texto — aprendizado)</option>
            </select>
          </label>
          {kind === "novel" && (
            <label className="auth-field">
              <span>Idioma</span>
              <select
                className="select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as "pt" | "en")}
              >
                <option value="pt">Português</option>
                <option value="en">Inglês</option>
              </select>
            </label>
          )}
        </div>
        <label className="auth-field">
          <span>Categorias (separadas por vírgula)</span>
          <input
            value={categories}
            onChange={(e) => setCategories(e.target.value)}
            placeholder="Ação, Aventura, Fantasia"
          />
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
