import Link from "next/link";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getCurrentUser, hasRole } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

/**
 * Admin shell | a fixed sidebar (sections + active state) beside the page body.
 * Guarded: only admin/staff get in; everyone else sees a not-authorized notice
 * (no redirect loop, no info leak about the panel).
 */
export default async function AdminLayout({ children }: React.PropsWithChildren) {
  const user = (await getCurrentUser()) as { name?: string; role?: string } | null;
  const allowed = hasRole(user, "staff");

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
    <div className="admin-shell">
      <AdminSidebar name={user?.name ?? "Equipe"} role={user?.role ?? "staff"} />
      <main className="admin-main">{children}</main>
    </div>
  );
}
