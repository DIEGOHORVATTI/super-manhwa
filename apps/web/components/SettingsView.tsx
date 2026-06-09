"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Icon } from "@/components/Icon";
import { anilistConfigured } from "@/lib/anilist";
import { authClient, useSession } from "@/lib/auth/client";

interface AniListLink {
  id: string;
  name: string;
}

/**
 * Account settings: edit profile (name/@/bio), change password, and manage
 * linked AniList accounts (add more, unlink). Requires sign-in.
 */
export function SettingsView() {
  const { data: session, isPending } = useSession();
  const user = session?.user as
    | { name?: string; handle?: string | null; bio?: string | null; email?: string }
    | undefined;

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  const [links, setLinks] = useState<AniListLink[]>([]);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setHandle(user.handle ?? "");
      setBio(user.bio ?? "");
    }
  }, [user]);

  const loadLinks = async () => {
    const res = await fetch("/api/anilist/link");
    if (res.ok) setLinks((await res.json()).accounts ?? []);
  };
  useEffect(() => {
    if (session) void loadLinks();
  }, [session]);

  if (isPending) return <p className="muted settings-wrap">Carregando…</p>;
  if (!user) {
    return (
      <div className="settings-wrap">
        <p className="muted">
          <Link href="/login">Entre</Link> para acessar suas configurações.
        </p>
      </div>
    );
  }

  async function saveProfile() {
    setErr(null);
    setSavedMsg(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, handle, bio }),
    });
    if (res.ok) setSavedMsg("Perfil salvo.");
    else setErr((await res.json()).error ?? "Erro ao salvar.");
  }

  async function changePassword() {
    setPwMsg(null);
    const res = await authClient.changePassword({
      currentPassword: currentPw,
      newPassword: newPw,
    });
    if (res.error) setPwMsg(res.error.message ?? "Erro ao trocar a senha.");
    else {
      setPwMsg("Senha alterada.");
      setCurrentPw("");
      setNewPw("");
    }
  }

  async function unlink(id: string) {
    await fetch(`/api/anilist/link/${id}`, { method: "DELETE" });
    await loadLinks();
  }

  function addAniList() {
    const clientId = process.env.NEXT_PUBLIC_ANILIST_CLIENT_ID;
    if (!clientId) return;
    const redirect = `${window.location.origin}/auth/anilist`;
    window.location.href = `https://anilist.co/api/v2/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code`;
  }

  return (
    <div className="settings-wrap">
      <h1 className="settings-title">Configurações</h1>

      <section className="settings-card">
        <h2>Perfil</h2>
        <label className="auth-field">
          <span>Nome</span>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="auth-field">
          <span>@ (handle)</span>
          <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="seu_nome" />
        </label>
        <label className="auth-field">
          <span>Bio</span>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={300} />
        </label>
        {err && <p className="auth-error">{err}</p>}
        {savedMsg && <p className="auth-notice">{savedMsg}</p>}
        <button type="button" className="auth-submit" onClick={saveProfile}>
          Salvar perfil
        </button>
      </section>

      <section className="settings-card">
        <h2>Senha</h2>
        <label className="auth-field">
          <span>Senha atual</span>
          <input
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <label className="auth-field">
          <span>Nova senha</span>
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        {pwMsg && <p className="auth-notice">{pwMsg}</p>}
        <button type="button" className="auth-submit" onClick={changePassword}>
          Alterar senha
        </button>
      </section>

      {anilistConfigured && (
        <section className="settings-card">
          <h2>Contas AniList</h2>
          <p className="muted">Vincule uma ou mais contas AniList ao seu perfil.</p>
          {links.length === 0 ? (
            <p className="muted">Nenhuma conta vinculada ainda.</p>
          ) : (
            <ul className="settings-links">
              {links.map((l) => (
                <li key={l.id}>
                  <span>
                    <Icon name="star" size={15} /> {l.name}
                  </span>
                  <button type="button" className="comment-link" onClick={() => unlink(l.id)}>
                    Desvincular
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="auth-google" onClick={addAniList}>
            Vincular conta AniList
          </button>
        </section>
      )}
    </div>
  );
}
