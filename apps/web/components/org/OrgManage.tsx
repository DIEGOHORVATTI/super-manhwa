"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { downscaleToJpeg } from "@/lib/image-resize";
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
interface Invite {
  id: number;
  email: string;
  role: string;
}
interface Work {
  id: number;
  title: string;
  slug: string;
  teamId: number | null;
  status: string;
}
interface Data {
  org: Org;
  members: Member[];
  invitations: Invite[];
  myWorks: Work[];
  avatarUrl: string | null;
  bannerUrl: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Dono",
  editor: "Editor",
  translator: "Tradutor",
  reviewer: "Revisor",
};

/** Re-encode to JPEG (handles huge phone photos), then POST to the upload route. */
async function uploadImage(endpoint: string, file: File, maxDim: number): Promise<string | null> {
  const blob = await downscaleToJpeg(file, maxDim).catch(() => file);
  const out =
    blob.type === "image/jpeg" ? new File([blob], "image.jpg", { type: "image/jpeg" }) : file;
  const fd = new FormData();
  fd.set("image", out);
  const res = await fetch(endpoint, { method: "POST", body: fd });
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as { url?: string } | null;
  return json?.url ?? null;
}

/** Owner-only management for one organization: identity, members, invites, works. */
export function OrgManage({ id }: { id: number }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  // identity form
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // images (preview after upload)
  const [avatar, setAvatar] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  // member + invite forms
  const [handle, setHandle] = useState("");
  const [role, setRole] = useState<Role>("translator");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("translator");
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await rpc.org.manage({ id });
      setData(res);
      setName(res.org.name);
      setSlug(res.org.slug ?? "");
      setBio(res.org.bio ?? "");
      setIsPublic(res.org.isPublic);
      setAvatar(res.avatarUrl);
      setBanner(res.bannerUrl);
    } catch {
      setError("Organização não encontrada ou sem permissão.");
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <p className="muted studio-wrap">{error}</p>;
  if (!data) return <p className="muted studio-wrap">Carregando…</p>;
  const { org, members, invitations, myWorks } = data;

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

  async function pickImage(field: "avatar" | "banner", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const endpoint =
      field === "avatar" ? routes.api.org.avatar(id) : routes.api.org.banner(id);
    const url = await uploadImage(endpoint, file, field === "avatar" ? 512 : 1600);
    if (!url) {
      setError("Não foi possível enviar a imagem.");
      return;
    }
    if (field === "avatar") setAvatar(url);
    else setBanner(url);
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

  async function sendInvite() {
    if (!inviteEmail.trim()) return;
    try {
      const res = await rpc.org.invite.send({ id, email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail("");
      setInviteLink(res.link);
      await load();
    } catch {
      setError("Não foi possível enviar o convite.");
    }
  }

  async function revokeInvite(inviteId: number) {
    await rpc.org.invite.revoke({ id, inviteId });
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

        <div
          className="org-banner-edit"
          style={banner ? { backgroundImage: `url(${banner})` } : undefined}
        >
          <span className="org-avatar org-page-avatar">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" />
            ) : (
              name.charAt(0).toUpperCase() || "?"
            )}
          </span>
          <div className="org-img-actions">
            <button type="button" className="btn" onClick={() => avatarRef.current?.click()}>
              Logo
            </button>
            <button type="button" className="btn" onClick={() => bannerRef.current?.click()}>
              Banner
            </button>
          </div>
          <input
            ref={avatarRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => pickImage("avatar", e)}
          />
          <input
            ref={bannerRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => pickImage("banner", e)}
          />
        </div>

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
        <h2>Convites por e-mail</h2>
        <p className="muted">
          Para quem ainda não tem conta. Recebe um link; ao aceitar logado com esse e-mail, entra na
          equipe.
        </p>
        {invitations.length > 0 && (
          <div className="org-members">
            {invitations.map((inv) => (
              <div key={inv.id} className="org-member-row">
                <span>{inv.email}</span>
                <span className="status-badge">{ROLE_LABEL[inv.role] ?? inv.role}</span>
                <button type="button" className="btn-link" onClick={() => revokeInvite(inv.id)}>
                  revogar
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="studio-upload-row">
          <label className="auth-field" style={{ flex: 1 }}>
            <span>E-mail</span>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="pessoa@email.com"
            />
          </label>
          <label className="auth-field">
            <span>Cargo</span>
            <select
              className="select"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
            >
              <option value="translator">Tradutor</option>
              <option value="reviewer">Revisor</option>
              <option value="editor">Editor</option>
            </select>
          </label>
          <button type="button" className="auth-submit" onClick={sendInvite}>
            Convidar
          </button>
        </div>
        {inviteLink && (
          <p className="muted">
            Link do convite (caso o e-mail não chegue): <br />
            <code className="org-invite-link">{inviteLink}</code>
          </p>
        )}
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
