"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/Icon";
import { SettingsView } from "@/components/SettingsView";
import { Modal } from "@/components/ui/Modal";
import { authClient, useSession } from "@/lib/auth/client";
import { routes } from "@/lib/routes";

/**
 * Header account control. Anonymous → "Entrar" link. Signed-in → avatar button
 * that opens a dropdown (perfil, biblioteca, studio, sair).
 * Reuses the existing button/card visual language; `role` comes from the
 * session's additional fields.
 */
export function UserMenu() {
  const { data, isPending } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    | {
        id?: string;
        name?: string;
        email?: string;
        image?: string | null;
        role?: string;
        handle?: string | null;
      }
    | undefined;

  if (!user) {
    return (
      <Link href={routes.login} className="user-login-btn">
        <Icon name="log-in" size={16} />
        <span>Entrar</span>
      </Link>
    );
  }

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
          <Link
            href={routes.user(user.handle || user.id || "")}
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Icon name="user" size={15} /> Meu perfil
          </Link>
          <Link href={routes.library} role="menuitem" onClick={() => setOpen(false)}>
            <Icon name="heart" size={15} /> Biblioteca
          </Link>
          <button
            type="button"
            role="menuitem"
            className="user-menu-item"
            onClick={() => {
              setOpen(false);
              setSettingsOpen(true);
            }}
          >
            <Icon name="settings" size={15} /> Configurações
          </button>
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

      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Configurações"
        size="md"
      >
        <SettingsView />
      </Modal>
    </div>
  );
}
