"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Chapter {
  id: number;
  number: string;
  title: string | null;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
}
interface Member {
  userId: string;
  role: string;
  name: string | null;
  handle: string | null;
}
interface Access {
  isOwner: boolean;
  canEditWork: boolean;
  canManageTeam: boolean;
  canPublish: boolean;
  canReview: boolean;
  canEditChapters: boolean;
}

const CH_STATUS: Record<string, string> = {
  draft: "Rascunho",
  in_review: "Em revisão",
  scheduled: "Agendado",
  published: "Publicado",
};

/** Manage a single work: chapters lifecycle, uploads, reviews and team. */
export function StudioWork({ workId }: { workId: number }) {
  const [data, setData] = useState<{
    work: {
      title: string;
      slug: string;
      status: string;
      synopsis: string | null;
      kind?: string;
      language?: string | null;
    };
    chapters: Chapter[];
    members: Member[];
    access: Access;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studio/works/${workId}`);
    if (res.ok) setData(await res.json());
    else setErr("Sem acesso a esta obra.");
  }, [workId]);
  useEffect(() => {
    void load();
  }, [load]);

  if (err) return <p className="muted studio-wrap">{err}</p>;
  if (!data) return <p className="muted studio-wrap">Carregando…</p>;
  const { work, chapters, members, access } = data;

  async function chapterAction(id: number, body: Record<string, unknown>) {
    await fetch(`/api/studio/chapters/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
  }

  async function review(id: number, decision: "approved" | "changes_requested") {
    const note =
      decision === "changes_requested" ? (prompt("Nota para o tradutor (opcional):") ?? "") : "";
    await fetch(`/api/studio/chapters/${id}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, note }),
    });
    await load();
  }

  return (
    <div className="studio-wrap">
      <div className="studio-head">
        <div>
          <h1 className="settings-title" style={{ marginBottom: 4 }}>
            {work.title}
          </h1>
          <span className={`status-badge status-${work.status}`}>{work.status}</span>
        </div>
        <Link href="/studio" className="comment-link">
          ← Todas as obras
        </Link>
      </div>

      {access.canEditWork && <CoverUpload workId={workId} onDone={load} />}

      <section className="settings-card">
        <div className="studio-section-head">
          <h2>Capítulos</h2>
        </div>
        {chapters.length === 0 ? (
          <p className="muted">Nenhum capítulo ainda. Adicione abaixo.</p>
        ) : (
          <ul className="studio-chapters">
            {chapters.map((c) => (
              <li key={c.id}>
                <div className="studio-chapter-info">
                  <strong>
                    Cap. {c.number}
                    {c.title ? ` — ${c.title}` : ""}
                  </strong>
                  <span className={`status-badge status-${c.status}`}>
                    {CH_STATUS[c.status] ?? c.status}
                    {c.scheduledAt ? ` · ${new Date(c.scheduledAt).toLocaleString("pt-BR")}` : ""}
                  </span>
                </div>
                <div className="studio-chapter-actions">
                  <Link href={`/studio/${workId}/preview/${c.id}`} className="comment-link">
                    Preview
                  </Link>
                  {access.canEditChapters && c.status === "draft" && (
                    <button
                      type="button"
                      className="comment-link"
                      onClick={() => chapterAction(c.id, { action: "submit" })}
                    >
                      Enviar p/ revisão
                    </button>
                  )}
                  {access.canReview && c.status === "in_review" && (
                    <>
                      <button
                        type="button"
                        className="comment-link"
                        onClick={() => review(c.id, "approved")}
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        className="comment-link"
                        onClick={() => review(c.id, "changes_requested")}
                      >
                        Pedir alterações
                      </button>
                    </>
                  )}
                  {access.canPublish && c.status !== "published" && (
                    <>
                      <button
                        type="button"
                        className="comment-link"
                        onClick={() => {
                          const when = prompt("Agendar para (YYYY-MM-DD HH:mm):");
                          if (when) {
                            const iso = new Date(when.replace(" ", "T")).toISOString();
                            void chapterAction(c.id, { action: "schedule", scheduledAt: iso });
                          }
                        }}
                      >
                        Agendar
                      </button>
                      <button
                        type="button"
                        className="comment-link"
                        onClick={() => chapterAction(c.id, { action: "publish" })}
                      >
                        Publicar
                      </button>
                    </>
                  )}
                  {access.canPublish && c.status === "published" && (
                    <button
                      type="button"
                      className="comment-link"
                      onClick={() => chapterAction(c.id, { action: "unpublish" })}
                    >
                      Despublicar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {access.canEditChapters &&
        (work.kind === "novel" ? (
          <TextChapterUpload workId={workId} onDone={load} />
        ) : (
          <ChapterUpload workId={workId} onDone={load} />
        ))}

      {access.canManageTeam && <TeamManager workId={workId} members={members} onChange={load} />}
    </div>
  );
}

function CoverUpload({ workId, onDone }: { workId: number; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setMsg(null);
    const fd = new FormData();
    fd.set("image", file);
    const res = await fetch(`/api/studio/works/${workId}/cover`, { method: "POST", body: fd });
    setBusy(false);
    if (res.ok) {
      setMsg("Capa atualizada.");
      onDone();
    } else {
      const j = await res.json().catch(() => ({}));
      setMsg(
        j.error === "storage_unconfigured"
          ? "Armazenamento R2 não configurado."
          : "Falha no envio.",
      );
    }
  }

  return (
    <section className="settings-card">
      <h2>Capa</h2>
      <label className="auth-field">
        <span>Imagem da capa</span>
        <input
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
      </label>
      {msg && <p className="auth-notice">{msg}</p>}
    </section>
  );
}

function TextChapterUpload({ workId, onDone }: { workId: number; onDone: () => void }) {
  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    if (!number.trim() || !content.trim()) {
      setMsg("Informe o número e o texto do capítulo.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/studio/works/${workId}/text-chapters`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ number, title, content }),
    });
    setBusy(false);
    if (res.ok) {
      const j = await res.json();
      setNumber("");
      setTitle("");
      setContent("");
      setMsg(
        `Capítulo salvo e tokenizado (${j.chapter.tokens} tokens, ${j.chapter.lemmas} palavras).`,
      );
      onDone();
    } else {
      const j = await res.json().catch(() => ({}));
      setMsg(j.error ?? "Falha ao salvar.");
    }
  }

  return (
    <section className="settings-card">
      <h2>Novo capítulo (texto)</h2>
      <div className="studio-upload-row">
        <label className="auth-field">
          <span>Número</span>
          <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Ex.: 1" />
        </label>
        <label className="auth-field" style={{ flex: 1 }}>
          <span>Título (opcional)</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
      </div>
      <label className="auth-field">
        <span>Texto do capítulo</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          placeholder="Cole aqui o texto da novel…"
        />
      </label>
      {msg && <p className="auth-notice">{msg}</p>}
      <button type="button" className="auth-submit" onClick={save} disabled={busy}>
        {busy ? "Salvando…" : "Salvar capítulo"}
      </button>
    </section>
  );
}

function ChapterUpload({ workId, onDone }: { workId: number; onDone: () => void }) {
  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function upload() {
    if (!number.trim() || !files?.length) {
      setMsg("Informe o número e selecione as páginas.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const form = new FormData();
    form.set("number", number);
    form.set("title", title);
    for (const f of Array.from(files)) form.append("pages", f);
    const res = await fetch(`/api/studio/works/${workId}/chapters`, { method: "POST", body: form });
    setBusy(false);
    if (res.ok) {
      setNumber("");
      setTitle("");
      setFiles(null);
      setMsg("Capítulo enviado como rascunho.");
      onDone();
    } else {
      const j = await res.json().catch(() => ({}));
      setMsg(
        j.error === "storage_unconfigured"
          ? "Armazenamento R2 não configurado."
          : "Falha no envio.",
      );
    }
  }

  return (
    <section className="settings-card">
      <h2>Novo capítulo</h2>
      <div className="studio-upload-row">
        <label className="auth-field">
          <span>Número</span>
          <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Ex.: 1" />
        </label>
        <label className="auth-field" style={{ flex: 1 }}>
          <span>Título (opcional)</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
      </div>
      <label className="auth-field">
        <span>Páginas (imagens, na ordem)</span>
        <input type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} />
      </label>
      {msg && <p className="auth-notice">{msg}</p>}
      <button type="button" className="auth-submit" onClick={upload} disabled={busy}>
        {busy ? "Enviando…" : "Enviar capítulo"}
      </button>
    </section>
  );
}

function TeamManager({
  workId,
  members,
  onChange,
}: {
  workId: number;
  members: Member[];
  onChange: () => void;
}) {
  const [handle, setHandle] = useState("");
  const [role, setRole] = useState("translator");

  async function add() {
    if (!handle.trim()) return;
    await fetch(`/api/studio/works/${workId}/team`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ handle, role }),
    });
    setHandle("");
    onChange();
  }
  async function remove(userId: string) {
    await fetch(`/api/studio/works/${workId}/team`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    onChange();
  }

  return (
    <section className="settings-card">
      <h2>Equipe</h2>
      <ul className="settings-links">
        {members.map((m) => (
          <li key={m.userId}>
            <span>
              {m.name ?? m.handle ?? m.userId} · <em>{m.role}</em>
            </span>
            {m.role !== "owner" && (
              <button type="button" className="comment-link" onClick={() => remove(m.userId)}>
                Remover
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="studio-upload-row">
        <label className="auth-field" style={{ flex: 1 }}>
          <span>@ do usuário</span>
          <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="handle" />
        </label>
        <label className="auth-field">
          <span>Cargo</span>
          <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="translator">Tradutor</option>
            <option value="reviewer">Revisor</option>
            <option value="editor">Editor</option>
          </select>
        </label>
      </div>
      <button type="button" className="auth-submit" onClick={add}>
        Adicionar membro
      </button>
    </section>
  );
}
