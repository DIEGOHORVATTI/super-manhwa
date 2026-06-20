"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useSession } from "@/lib/auth/client";
import { routes } from "@/lib/routes";
import { rpc } from "@/lib/rpc/client";

interface Org {
  id: number;
  name: string;
  slug: string | null;
  isPublic: boolean;
  avatarR2Key: string | null;
  role: string;
}

/** "Minhas organizações" island: list the orgs I belong to + create a new one. */
export function OrgsMine() {
  const { data: session, isPending } = useSession();
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      const { orgs } = await rpc.org.mine();
      setOrgs(orgs ?? []);
    } catch {
      setOrgs([]);
    }
  }
  useEffect(() => {
    if (session) void load();
  }, [session]);

  if (isPending) return null;
  if (!session?.user) {
    return (
      <p className="muted">
        <Link href={routes.login}>Entre</Link> para criar uma organização.
      </p>
    );
  }

  async function create() {
    if (name.trim().length < 2) return;
    setCreating(true);
    try {
      await rpc.org.create({ name });
      setName("");
      await load();
    } catch {
      // leave the form as-is so the user can retry
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="settings-card">
      <h2>Nova organização</h2>
      <div className="studio-upload-row">
        <label className="auth-field" style={{ flex: 1 }}>
          <span>Nome</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Lua Cheia Scans"
          />
        </label>
        <button
          type="button"
          className="auth-submit"
          onClick={create}
          disabled={creating || name.trim().length < 2}
        >
          {creating ? "Criando…" : "Criar"}
        </button>
      </div>

      {orgs && orgs.length > 0 && (
        <>
          <h2 className="section">Minhas organizações</h2>
          <div className="studio-works">
            {orgs.map((o) => (
              <Link key={o.id} href={routes.orgManage(o.id)} className="studio-work-card">
                <strong>{o.name}</strong>
                <span className={`status-badge status-${o.isPublic ? "published" : "draft"}`}>
                  {o.role === "owner" ? "Dono" : o.role} · {o.isPublic ? "Pública" : "Privada"}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
