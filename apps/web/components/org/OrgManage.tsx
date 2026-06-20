"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { routes } from "@/lib/routes";
import { rpc } from "@/lib/rpc/client";

type Role = "editor" | "translator" | "reviewer";

interface Org {
  id: number;
  name: string;
  slug: string | null;
  bio: string | null;
  isPublic: boolean;
  ownerId: string;
}
interface Member {
  userId: string;
  role: string;
  name: string | null;
  handle: string | null;
}
interface Work {
  id: number;
  title: string;
  slug: string;
  teamId: number | null;
  status: string;
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Dono",
  editor: "Editor",
  translator: "Tradutor",
  reviewer: "Revisor",
};

/** Owner-only management for one organization: identity, members and works. */
export function OrgManage({ id }: { id: number }) {
  const [data, setData] = useState<{ org: Org; members: Member[]; myWorks: Work[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // identity form
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // member form
  const [handle, setHandle] = useState("");
  const [role, setRole] = useState<Role>("translator");

  const load = useCallback(async () => {
    try {
      const res = await rpc.org.manage({ id });
      setData(res);
      setName(res.org.name);
      setSlug(res.org.slug ?? "");
      setBio(res.org.bio ?? "");
      setIsPublic(res.org.isPublic);
    } catch {
      setError("Organização não encontrada ou sem permissão.");
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <p className="muted studio-wrap">{error}</p>;
  if (!data) return <p className="muted studio-wrap">Carregando…</p>;
  const { org, members, myWorks } = data;

  async function saveIdentity() {
    setSaving(true);
    setSaved(false);
    try {
      await rpc.org.update({
        id,
        name,
        slug: slug.trim() || undefined,
        bio: bio.trim() || null,
        isPublic,
      });
      setSaved(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function addMember() {
    if (!handle.trim()) return;
    try {
      await rpc.org.member.add({ id, handle: handle.replace(/^@/, ""), role });
      setHandle("");
      await load();
    } catch {
      setError("Não foi possível adicionar (usuário existe? tem @handle?).");
    }
  }

  async function removeMember(userId: string) {
    await rpc.org.member.remove({ id, userId });
    await load();
  }

  async function toggleWork(work: Work) {
    const attached = work.teamId === org.id;
    await rpc.org.attachWork(attached ? { workId: work.id } : { id, workId: work.id });
    await load();
  }

  return (
    <div className="studio-wrap">
      <div className="profile-actions">
        <Link href={routes.orgs} className="btn">
          ← Organizações
        </Link>
        {org.isPublic && org.slug && (
          <Link href={routes.org(org.slug)} className="btn btn-primary">
            Ver página pública
          </Link>
        )}
      </div>

      <section className="settings-card">
        <h2>Identidade</h2>
        <label className="auth-field">
          <span>Nome</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="auth-field">
          <span>Endereço público (slug)</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="lua-cheia-scans"
          />
          <small className="muted">/org/{slug || "…"}</small>
        </label>
        <label className="auth-field">
          <span>Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Sobre a organização, idiomas, redes…"
          />
        </label>
        <label className="auth-field auth-checkbox">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          <span>Listar publicamente no diretório</span>
        </label>
        <button type="button" className="auth-submit" onClick={saveIdentity} disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </button>
        {saved && <p className="muted">Salvo.</p>}
      </section>

      <section className="settings-card">
        <h2>Membros</h2>
        <div className="org-members">
          {members.map((m) => (
            <div key={m.userId} className="org-member-row">
              <span>
                {m.handle ? (
                  <Link href={routes.user(m.handle)}>{m.name ?? `@${m.handle}`}</Link>
                ) : (
                  (m.name ?? m.userId)
                )}
              </span>
              <span className="status-badge">{ROLE_LABEL[m.role] ?? m.role}</span>
              {m.userId !== org.ownerId && (
                <button type="button" className="btn-link" onClick={() => removeMember(m.userId)}>
                  remover
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="studio-upload-row">
          <label className="auth-field" style={{ flex: 1 }}>
            <span>Adicionar por @handle</span>
            <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@user" />
          </label>
          <label className="auth-field">
            <span>Cargo</span>
            <select
              className="select"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="translator">Tradutor</option>
              <option value="reviewer">Revisor</option>
              <option value="editor">Editor</option>
            </select>
          </label>
          <button type="button" className="auth-submit" onClick={addMember}>
            Adicionar
          </button>
        </div>
      </section>

      <section className="settings-card">
        <h2>Obras da organização</h2>
        <p className="muted">Vincule suas obras a esta organização (ou desvincule).</p>
        {myWorks.length === 0 ? (
          <p className="muted">Você não tem obras. Crie em Studio.</p>
        ) : (
          <div className="org-members">
            {myWorks.map((w) => {
              const attached = w.teamId === org.id;
              return (
                <div key={w.id} className="org-member-row">
                  <span>{w.title}</span>
                  <button
                    type="button"
                    className={attached ? "btn-link" : "auth-submit"}
                    onClick={() => toggleWork(w)}
                  >
                    {attached ? "desvincular" : "vincular"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
