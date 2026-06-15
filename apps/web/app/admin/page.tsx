import Link from "next/link";

/** Admin overview | entry points into each moderation area. */
export default function AdminOverview() {
  return (
    <>
      <h1 className="settings-title">Painel da equipe</h1>
      <div className="admin-cards">
        <Link href="/admin/users" className="studio-work-card">
          <strong>Usuários</strong>
          <span className="muted">Papéis e banimentos</span>
        </Link>
        <Link href="/admin/comments" className="studio-work-card">
          <strong>Comentários</strong>
          <span className="muted">Moderação</span>
        </Link>
        <Link href="/admin/donations" className="studio-work-card">
          <strong>Doações</strong>
          <span className="muted">Histórico e totais</span>
        </Link>
      </div>
    </>
  );
}
