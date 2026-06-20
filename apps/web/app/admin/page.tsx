import Link from "next/link";
import { count, eq, isNull, sql } from "drizzle-orm";

import { Icon, type IconName } from "@/components/Icon";
import { dbEnabled, getDb, schema } from "@/lib/db";
import { routes } from "@/lib/routes";

const brl = (cents: number) => `R$${(cents / 100).toFixed(2)}`;

/** One number from a `select({ n })` row, defaulting to 0. */
const n = (rows: Array<{ n: number | string | null }>) => Number(rows[0]?.n ?? 0);

async function loadStats() {
  if (!dbEnabled) return null;
  const db = getDb();
  const { user, comments, donations, pixelBlocks, legalRequests } = schema;
  const [users, openComments, revenue, pendingPixels, legal] = await Promise.all([
    db.select({ n: count() }).from(user),
    db.select({ n: count() }).from(comments).where(isNull(comments.deletedAt)),
    db
      .select({ n: sql<number>`coalesce(sum(${donations.amountCents}), 0)` })
      .from(donations)
      .where(eq(donations.status, "approved")),
    db.select({ n: count() }).from(pixelBlocks).where(eq(pixelBlocks.status, "pending")),
    db.select({ n: count() }).from(legalRequests),
  ]);
  return {
    users: n(users),
    comments: n(openComments),
    revenueCents: n(revenue),
    pendingPixels: n(pendingPixels),
    legal: n(legal),
  };
}

export default async function AdminOverview() {
  const stats = await loadStats();

  const kpis: Array<{ label: string; value: string; icon: IconName; href: string }> = [
    {
      label: "Usuários",
      value: String(stats?.users ?? "—"),
      icon: "users",
      href: routes.admin.users,
    },
    {
      label: "Comentários",
      value: String(stats?.comments ?? "—"),
      icon: "message-square",
      href: routes.admin.comments,
    },
    {
      label: "Arrecadado",
      value: stats ? brl(stats.revenueCents) : "—",
      icon: "coins",
      href: routes.admin.donations,
    },
    {
      label: "Pixels pendentes",
      value: String(stats?.pendingPixels ?? "—"),
      icon: "mouse",
      href: routes.admin.pixels,
    },
    {
      label: "Pedidos DMCA",
      value: String(stats?.legal ?? "—"),
      icon: "scale",
      href: routes.admin.legal,
    },
  ];

  const links: Array<{ label: string; hint: string; icon: IconName; href: string }> = [
    {
      label: "Usuários",
      hint: "Papéis, banimentos e tags",
      icon: "users",
      href: routes.admin.users,
    },
    { label: "Tags", hint: "Catálogo de badges", icon: "tag", href: routes.admin.tags },
    {
      label: "Comentários",
      hint: "Moderação",
      icon: "message-square",
      href: routes.admin.comments,
    },
    { label: "Doações", hint: "Histórico e totais", icon: "coins", href: routes.admin.donations },
    {
      label: "Afiliados",
      hint: "Cliques e comissões",
      icon: "link-2",
      href: routes.admin.affiliates,
    },
    { label: "Pixels", hint: "Aprovação de anúncios", icon: "mouse", href: routes.admin.pixels },
    { label: "Conectores", hint: "Status e latência", icon: "plug", href: routes.admin.connectors },
    { label: "Cache", hint: "Obras pré-carregadas", icon: "database", href: routes.admin.cache },
    { label: "DMCA", hint: "Pedidos legais", icon: "scale", href: routes.admin.legal },
  ];

  return (
    <>
      <header className="admin-page-head">
        <h1 className="settings-title">Painel da equipe</h1>
        <p className="muted">Visão geral da operação.</p>
      </header>

      <div className="admin-kpis">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="admin-kpi">
            <span className="admin-kpi-icon">
              <Icon name={k.icon} size={20} />
            </span>
            <span className="admin-kpi-value">{k.value}</span>
            <span className="admin-kpi-label">{k.label}</span>
          </Link>
        ))}
      </div>

      <h2 className="admin-section-title">Áreas</h2>
      <div className="admin-cards">
        {links.map((l) => (
          <Link key={l.label} href={l.href} className="admin-card">
            <span className="admin-card-icon">
              <Icon name={l.icon} size={20} />
            </span>
            <span className="admin-card-text">
              <strong>{l.label}</strong>
              <span className="muted">{l.hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
