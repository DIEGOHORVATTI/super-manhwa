import type { MangaStatus } from "@packages/contracts";

const LABELS: Record<MangaStatus, string> = {
  ongoing: "Em andamento",
  completed: "Completo",
  hiatus: "Hiato",
  cancelled: "Cancelado",
  "publishing-finished": "Finalizado",
  unknown: "—",
};

/**
 * Small coloured pill describing the publication status. The colour scheme is
 * tuned to be readable on the dark surface but quiet enough not to dominate
 * the cover.
 */
export function StatusBadge({ status, size = "sm" }: { status?: MangaStatus; size?: "sm" | "md" }) {
  if (!status || status === "unknown") return null;
  return <span className={`status-badge status-${status} status-${size}`}>{LABELS[status]}</span>;
}
