"use client";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/Select";
import { rpc } from "@/lib/rpc/client";

interface Tag {
  key: string;
  label: string;
  emote: string | null;
  emoteUrl: string | null;
  color: string | null;
}

interface Row {
  id: string;
  name: string;
  email: string;
  handle: string | null;
  role: string;
  banned: boolean;
  tags: Tag[];
}

interface CatalogTag {
  key: string;
  label: string;
  assignable: boolean;
}

const chipStyle = (color: string | null) =>
  color ? { background: `color-mix(in srgb, ${color} 18%, transparent)`, color } : undefined;

const ROLE_OPTIONS = [
  { value: "user", label: "Usuário" },
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" },
];

/** User management: change role, ban/unban and hand out manual tags. */
export function AdminUsers() {
  const [users, setUsers] = useState<Row[] | null>(null);
  const [catalog, setCatalog] = useState<CatalogTag[]>([]);

  async function load() {
    try {
      const [{ users }, { tags }] = await Promise.all([
        rpc.admin.users.list(),
        rpc.admin.tags.list(),
      ]);
      setUsers(users ?? []);
      setCatalog((tags ?? []).filter((t) => t.assignable));
    } catch {
      /* leave previous state */
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function patch(
    userId: string,
    body: { role?: "user" | "staff" | "admin"; banned?: boolean },
  ) {
    try {
      await rpc.admin.users.update({ userId, ...body });
    } catch {
      /* ignore | load() refreshes truth */
    }
    await load();
  }

  async function assign(userId: string, tagKey: string) {
    if (!tagKey) return;
    try {
      await rpc.admin.users.assignTag({ userId, tagKey });
    } catch {
      /* ignore */
    }
    await load();
  }

  async function unassign(userId: string, tagKey: string) {
    try {
      await rpc.admin.users.unassignTag({ userId, tagKey });
    } catch {
      /* ignore */
    }
    await load();
  }

  if (!users) return <p className="muted">Carregando…</p>;

  return (
    <>
      <header className="admin-page-head">
        <h1 className="settings-title">Usuários</h1>
        <p className="muted">{users.length} contas mais recentes.</p>
      </header>

      <div className="admin-table">
        {users.map((u) => {
          const available = catalog.filter((t) => !u.tags.some((x) => x.key === t.key));
          return (
            <div key={u.id} className="admin-row">
              <div className="admin-row-main">
                <strong>{u.name}</strong>
                <span className="muted">{u.email}</span>
                {u.handle && <span className="muted">@{u.handle}</span>}
                {u.tags.length > 0 && (
                  <div className="admin-tags">
                    {u.tags.map((t) => (
                      <span key={t.key} className="badge badge-special" style={chipStyle(t.color)}>
                        {t.emoteUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.emoteUrl} alt="" className="badge-emote" />
                        )}
                        {t.label}
                        <button
                          type="button"
                          className="admin-tag-x"
                          aria-label={`Remover ${t.label}`}
                          onClick={() => unassign(u.id, t.key)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="admin-row-actions">
                {available.length > 0 && (
                  <Select
                    aria-label="Adicionar tag"
                    value=""
                    onChange={(v) => assign(u.id, v)}
                    options={[
                      { value: "", label: "+ tag…" },
                      ...available.map((t) => ({ value: t.key, label: t.label })),
                    ]}
                  />
                )}
                <Select
                  aria-label="Papel"
                  value={u.role}
                  onChange={(v) => patch(u.id, { role: v as "user" | "staff" | "admin" })}
                  options={ROLE_OPTIONS}
                />
                <Button
                  variant={u.banned ? "ghost" : "danger"}
                  size="sm"
                  onClick={() => patch(u.id, { banned: !u.banned })}
                >
                  {u.banned ? "Desbanir" : "Banir"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
