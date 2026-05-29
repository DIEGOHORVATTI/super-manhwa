"use client";
import { Icon } from "@/components/Icon";
import { useHistory } from "@/lib/library";

/**
 * "In progress" marker overlaid on a listing cover: shown only for works the
 * visitor has already started (present in local reading history), with the last
 * chapter opened. Client island fed by localStorage, so it renders nothing on
 * the server / for new visitors and never blocks a cached grid.
 */
export function PosterProgressBadge({ id }: { id: string }) {
  const entry = useHistory().find((e) => e.id === id);
  if (!entry) return null;
  const label = typeof entry.chapterNo === "number" ? `Cap ${entry.chapterNo}` : "Lendo";
  return (
    <span className="poster-progress" title={`Continuar lendo — ${label}`}>
      <Icon name="book-open" size={12} />
      {label}
    </span>
  );
}
