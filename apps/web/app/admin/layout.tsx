import Link from "next/link";

import { getCurrentUser, hasRole } from "@/lib/auth/session";

/**
 * Admin area guard. Only users with role admin/staff get in; everyone else sees
 * a not-authorized notice (no redirect loop, no info leak about the panel).
 */
export default async function AdminLayout({ children }: React.PropsWithChildren) {
  const user = await getCurrentUser();
  const allowed = hasRole(user as { role?: string } | null, "staff");

  if (!allowed) {
    return (
      <div className="admin-wrap">
        <h1 className="settings-title">Acesso restrito</h1>
        <p className="muted">
          Esta área é só para a equipe. <Link href="/">Voltar ao início</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="admin-wrap">
      <nav className="admin-nav">
        <Link href="/admin">Visão geral</Link>
        <Link href="/admin/users">Usuários</Link>
        <Link href="/admin/comments">Comentários</Link>
        <Link href="/admin/donations">Doações</Link>
        <Link href="/admin/affiliates">Afiliados</Link>
        <Link href="/admin/pixels">Pixels</Link>
      </nav>
      {children}
    </div>
  );
}
