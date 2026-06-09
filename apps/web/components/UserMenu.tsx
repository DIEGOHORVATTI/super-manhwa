"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/Icon";
import { authClient, useSession } from "@/lib/auth/client";

/**
 * Header account control. Anonymous → "Entrar" link. Signed-in → avatar button
 * that opens a dropdown (perfil, biblioteca, studio, admin if role, sair).
 * Reuses the existing button/card visual language; `role` comes from the
 * session's additional fields.
 */
export function UserMenu() {
  const { data, isPending } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (isPending) return <span className="user-menu-skel" aria-hidden="true" />;

  const user = data?.user as
    | { name?: string; email?: string; image?: string | null; role?: string; handle?: string | null }
    | undefined;

  if (!user) {
    return (
      <Link href="/login" className="user-login-btn">
        <Icon name="log-in" size={16} />
        <span>Entrar</span>
      </Link>
    );
  }

  const isAdmin = user.role === "admin" || user.role === "staff";
  const initial = (user.name || user.email || "?").charAt(0).toUpperCase();

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-menu-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="user-avatar" src={user.image} alt="" />
        ) : (
          <span className="user-avatar user-avatar-fallback">{initial}</span>
        )}
      </button>

      {open && (
        <div className="user-menu-dropdown" role="menu">
          <div className="user-menu-head">
            <strong>{user.name || "Usuário"}</strong>
            <span className="user-menu-email">{user.email}</span>
          </div>
          <Link href={`/u/${user.handle || ""}`} role="menuitem" onClick={() => setOpen(false)}>
            <Icon name="user" size={15} /> Meu perfil
          </Link>
          <Link href="/library" role="menuitem" onClick={() => setOpen(false)}>
            <Icon name="heart" size={15} /> Biblioteca
          </Link>
          <Link href="/studio" role="menuitem" onClick={() => setOpen(false)}>
            <Icon name="pen-line" size={15} /> Studio
          </Link>
          <Link href="/settings" role="menuitem" onClick={() => setOpen(false)}>
            <Icon name="settings" size={15} /> Configurações
          </Link>
          {isAdmin && (
            <Link href="/admin" role="menuitem" onClick={() => setOpen(false)}>
              <Icon name="shield" size={15} /> Admin
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            className="user-menu-signout"
            onClick={async () => {
              await authClient.signOut();
              setOpen(false);
              router.refresh();
            }}
          >
            <Icon name="log-out" size={15} /> Sair
          </button>
        </div>
      )}
    </div>
  );
}
