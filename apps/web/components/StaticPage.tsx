import Link from "next/link";

/**
 * Shared shell for the static/legal pages linked from the footer (sobre,
 * contato, privacidade, termos, dmca, cookies). Keeps a consistent back-link,
 * title, and prose container so each route file only carries its copy.
 */
export function StaticPage({
  title,
  updated,
  children,
}: React.PropsWithChildren<{ title: string; updated?: string }>) {
  return (
    <article className="static-page">
      <Link href="/" className="back">
        ← Voltar
      </Link>
      <h1 className="static-title">{title}</h1>
      {updated && <p className="muted">Última atualização: {updated}</p>}
      <div className="prose">{children}</div>
    </article>
  );
}
