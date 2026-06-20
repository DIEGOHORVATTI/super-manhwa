"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "@/components/Icon";
import { routes } from "@/lib/routes";

interface Item {
  href: string;
  label: string;
  icon: IconName;
}
interface Group {
  title: string | null;
  items: Item[];
}

const NAV: Group[] = [
  {
    title: null,
    items: [{ href: routes.admin.root, label: "Visão geral", icon: "layout-dashboard" }],
  },
  {
    title: "Comunidade",
    items: [
      { href: routes.admin.users, label: "Usuários", icon: "users" },
      { href: routes.admin.tags, label: "Tags", icon: "tag" },
      { href: routes.admin.comments, label: "Comentários", icon: "message-square" },
    ],
  },
  {
    title: "Receita",
    items: [
      { href: routes.admin.donations, label: "Doações", icon: "coins" },
      { href: routes.admin.affiliates, label: "Afiliados", icon: "link-2" },
      { href: routes.admin.pixels, label: "Pixels", icon: "mouse" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { href: routes.admin.connectors, label: "Conectores", icon: "plug" },
      { href: routes.admin.cache, label: "Cache", icon: "database" },
    ],
  },
  {
    title: "Jurídico",
    items: [{ href: routes.admin.legal, label: "DMCA", icon: "scale" }],
  },
];

const isActive = (pathname: string, href: string) =>
  href === routes.admin.root ? pathname === href : pathname.startsWith(href);

export function AdminSidebar({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <Icon name="shield" size={18} />
        <span>Admin</span>
      </div>

      <nav className="admin-side-nav">
        {NAV.map((g, i) => (
          <div key={g.title ?? i} className="admin-nav-group">
            {g.title && <p className="admin-nav-heading">{g.title}</p>}
            {g.items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                aria-current={isActive(pathname, it.href) ? "page" : undefined}
                className={`admin-side-link${isActive(pathname, it.href) ? " is-active" : ""}`}
              >
                <Icon name={it.icon} size={18} />
                {it.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="admin-side-foot">
        <div className="admin-side-user">
          <span className="admin-side-name">{name}</span>
          <span className="badge badge-staff">{role}</span>
        </div>
        <Link href={routes.home} className="admin-side-link">
          <Icon name="arrow-left" size={18} />
          Voltar ao site
        </Link>
      </div>
    </aside>
  );
}
