"use client";
import { useEffect, useState } from "react";

import { rpc } from "@/lib/rpc/client";

interface Row {
  id: string;
  name: string;
  email: string;
  handle: string | null;
  role: string;
  banned: boolean;
}

/** User management: change role and ban/unban. */
export function AdminUsers() {
  const [users, setUsers] = useState<Row[] | null>(null);

  async function load() {
    try {
      const { users } = await rpc.admin.users.list();
      setUsers(users ?? []);
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
            </div>
            <div className="admin-row-actions">
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
