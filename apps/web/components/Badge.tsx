import type { Badge } from "@/lib/badges";

/**
 * One badge chip. A catalog `color` (hex) drives a translucent pill via CSS
 * color-mix; otherwise the `badge-${tone}` class supplies the look. Pure, so it
 * renders the same on the server (profile) and client (comments).
 */
export function BadgeChip({ b, tip = false }: { b: Badge; tip?: boolean }) {
  const style = b.color
    ? { background: `color-mix(in srgb, ${b.color} 18%, transparent)`, color: b.color }
    : undefined;
  return (
    <span
      className={`badge badge-${b.tone}${tip && b.description ? " has-tip" : ""}`}
      style={style}
    >
      {b.emoji ? `${b.emoji} ` : ""}
      {b.label}
      {tip && b.description && (
        <span className="badge-tip" role="tooltip">
          {b.description}
        </span>
      )}
    </span>
  );
}
