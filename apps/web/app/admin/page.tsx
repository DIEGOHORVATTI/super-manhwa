import Link from "next/link";

import { routes } from "@/lib/routes";

/** Admin overview | entry points into each moderation area. */
export default function AdminOverview() {
  return (
    <>
      <h1 className="settings-title">Painel da equipe</h1>
      <div className="admin-cards">
        <Link href={routes.admin.users} className="studio-work-card">
          <strong>Usuários</strong>
          <span className="muted">Papéis e banimentos</span>
        </Link>
        <Link href={routes.admin.comments} className="studio-work-card">
          <strong>Comentários</strong>
          <span className="muted">Moderação</span>
        </Link>
        <Link href={routes.admin.donations} className="studio-work-card">
          <strong>Doações</strong>
          <span className="muted">Histórico e totais</span>
        </Link>
        <Link href={routes.admin.emojis} className="studio-work-card">
          <strong>Figurinhas</strong>
          <span className="muted">Upload e importação em massa</span>
        </Link>
      </div>
    </>
  );
}
