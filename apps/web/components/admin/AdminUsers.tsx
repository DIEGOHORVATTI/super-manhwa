"use client";
import { useEffect, useState } from "react";

import { rpc } from "@/lib/rpc/client";

interface Tag {
  key: string;
  label: string;
  emoji: string | null;
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

interface CatalogTag extends Tag {
  assignable: boolean;
}

const chipStyle = (color: string | null) =>
  color ? { background: `color-mix(in srgb, ${color} 18%, transparent)`, color } : undefined;

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
      <h1 className="settings-title">Usuários</h1>
      <div className="admin-table">
        {users.map((u) => (
          <div key={u.id} className="admin-row">
            <div className="admin-row-main">
              <strong>{u.name}</strong>
              <span className="muted">{u.email}</span>
              {u.handle && <span className="muted">@{u.handle}</span>}
              <div className="admin-tags">
                {u.tags.map((t) => (
                  <span key={t.key} className="badge badge-special" style={chipStyle(t.color)}>
                    {t.emoji ? `${t.emoji} ` : ""}
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
            </div>
            <div className="admin-row-actions">
              <select
                className="select"
                value=""
                onChange={(e) => {
                  assign(u.id, e.target.value);
                  e.target.value = "";
                }}
              >
                <option value="">+ tag…</option>
                {catalog
                  .filter((t) => !u.tags.some((x) => x.key === t.key))
                  .map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.emoji ? `${t.emoji} ` : ""}
                      {t.label}
                    </option>
                  ))}
              </select>
              <select
                className="select"
                value={u.role}
                onChange={(e) =>
                  patch(u.id, { role: e.target.value as "user" | "staff" | "admin" })
                }
              >
                <option value="user">user</option>
                <option value="staff">staff</option>
                <option value="admin">admin</option>
              </select>
              <button
                type="button"
                className={`comment-link${u.banned ? " is-banned" : ""}`}
                onClick={() => patch(u.id, { banned: !u.banned })}
              >
                {u.banned ? "Desbanir" : "Banir"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
