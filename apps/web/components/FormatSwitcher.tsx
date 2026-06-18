import Link from "next/link";
import { api } from "@/lib/orpc.server";
import { routes } from "@/lib/routes";

const LABEL: Record<string, string> = {
  manga: "Mangá",
  manhwa: "Manhwa",
  manhua: "Manhua",
  novel: "Novel",
};

/**
 * Lets the reader switch between a work's available formats (e.g. Mangá ↔ Novel).
 * Server component, streamed behind Suspense | the `formats` probe (backend) is a
 * cross-source title lookup, so it never blocks the hero. Renders nothing when a
 * work has only one format, so a plain manga page stays unchanged.
 */
export async function FormatSwitcher({
  id,
  name,
  current,
}: {
  id: string;
  name: string;
  current?: string;
}) {
  const { formats } = await api.manga
    .formats({ id, name })
    .catch(() => ({ formats: [] as Array<{ format: string; id: string }> }));
  if (formats.length < 2) return null;

  return (
    <div className="format-switcher" role="group" aria-label="Escolher formato">
      {formats.map((fmt) => {
        const active = fmt.id === id || fmt.format === current;
        const label = LABEL[fmt.format] ?? fmt.format;
        return active ? (
          <span key={fmt.format} className="format-pill is-active" aria-current="true">
            {label}
          </span>
        ) : (
          <Link key={fmt.format} className="format-pill" href={routes.manga(fmt.id, name)}>
            {label}
          </Link>
        );
      })}
    </div>
  );
}
