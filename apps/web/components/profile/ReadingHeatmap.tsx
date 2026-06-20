import { buildHeatmap } from "@/lib/heatmap";

const PT_MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

/**
 * GitHub-style reading heatmap — one cell per day, colored by chapters read.
 * Server-rendered; the per-day tooltip uses the native `title` attribute. Cells
 * flex to fill the width (responsive); on mobile only the most recent weeks show.
 */
export function ReadingHeatmap({ events }: { events: Array<{ readAt: Date | string }> }) {
  const hm = buildHeatmap(
    events.map((e) => e.readAt),
    new Date(),
  );

  // Month abbreviation per column, shown only where the month changes.
  const monthOf = (week: { date: string }[]) => Number(week[0].date.split("-")[1]) - 1;
  const months = hm.weeks.map((week, wi) => {
    const m = monthOf(week);
    return wi > 0 && monthOf(hm.weeks[wi - 1]) === m ? "" : PT_MONTHS[m];
  });

  // "12 jun 2026" from a YYYY-MM-DD key.
  const fmtDay = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${Number(d)} ${PT_MONTHS[Number(m) - 1]} ${y}`;
  };
  const tipFor = (cell: { date: string; count: number }) =>
    `${cell.count === 0 ? "Nenhum capítulo" : `${cell.count} capítulo${cell.count === 1 ? "" : "s"}`} · ${fmtDay(cell.date)}`;

  // Today's cell, highlighted with a border.
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return (
    <section className="profile-section">
      <div className="profile-section-head">
        <h2 className="section">Leitura no último ano</h2>
        <span className="muted">
          {hm.total} capítulo{hm.total === 1 ? "" : "s"} em {hm.activeDays} dia
          {hm.activeDays === 1 ? "" : "s"}
        </span>
      </div>

      <div className="heatmap-months" aria-hidden="true">
        {months.map((m, i) => (
          <span key={i} className="heatmap-month">
            {m}
          </span>
        ))}
      </div>
      <div className="heatmap" role="img" aria-label={`${hm.total} capítulos lidos no último ano`}>
        {hm.weeks.map((week, wi) => (
          <div key={wi} className="heatmap-col">
            {week.map((cell) => (
              <div
                key={cell.date}
                className={`heatmap-cell heatmap-l${cell.level}${
                  cell.date === todayKey ? " is-today" : ""
                }`}
                data-tip={tipFor(cell)}
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
