import { buildHeatmap } from "@/lib/heatmap";

/**
 * GitHub-style reading heatmap — one cell per day, colored by chapters read.
 * Server-rendered; the per-day tooltip uses the native `title` attribute.
 */
export function ReadingHeatmap({ events }: { events: Array<{ readAt: Date | string }> }) {
  const hm = buildHeatmap(
    events.map((e) => e.readAt),
    new Date(),
  );

  return (
    <section className="profile-section">
      <div className="profile-section-head">
        <h2 className="section">Leitura no último ano</h2>
        <span className="muted">
          {hm.total} capítulo{hm.total === 1 ? "" : "s"} em {hm.activeDays} dia
          {hm.activeDays === 1 ? "" : "s"}
        </span>
      </div>
      <div className="heatmap" role="img" aria-label={`${hm.total} capítulos lidos no último ano`}>
        {hm.weeks.map((week, wi) => (
          <div key={wi} className="heatmap-col">
            {week.map((cell) => (
              <div
                key={cell.date}
                className={`heatmap-cell heatmap-l${cell.level}`}
                title={`${cell.date}: ${cell.count} capítulo${cell.count === 1 ? "" : "s"}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span className="muted">menos</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <div key={l} className={`heatmap-cell heatmap-l${l}`} />
        ))}
        <span className="muted">mais</span>
      </div>
    </section>
  );
}
