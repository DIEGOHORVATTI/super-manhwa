import Link from "next/link";

import { getCurrentUser, hasRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

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
          Esta área é só para a equipe. <Link href={routes.home}>Voltar ao início</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="admin-wrap">
      <nav className="admin-nav">
        <Link href={routes.admin.root}>Visão geral</Link>
        <Link href={routes.admin.users}>Usuários</Link>
        <Link href={routes.admin.tags}>Tags</Link>
        <Link href={routes.admin.comments}>Comentários</Link>
        <Link href={routes.admin.donations}>Doações</Link>
        <Link href={routes.admin.affiliates}>Afiliados</Link>
        <Link href={routes.admin.pixels}>Pixels</Link>
        <Link href={routes.admin.connectors}>Conectores</Link>
        <Link href={routes.admin.cache}>Cache</Link>
      </nav>
      {children}
    </div>
  );
}
