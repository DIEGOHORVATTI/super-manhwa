/**
 * GitHub-style activity heatmap — pure, unit-testable. Given a list of event
 * dates, bucket them by local day and lay out a grid of weeks (columns) × 7
 * weekdays (rows, Sun→Sat) covering the last `days` days up to `today`.
 */
export interface HeatCell {
  date: string; // YYYY-MM-DD
  count: number;
  level: 0 | 1 | 2 | 3 | 4; // intensity bucket for CSS
}

export interface Heatmap {
  weeks: HeatCell[][]; // columns of 7 cells (Sun first); leading/trailing pad cells have count 0
  total: number; // total events in range
  activeDays: number; // days with ≥1 event
  max: number; // busiest day count
}

const dayKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const addDays = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

/** Intensity bucket relative to the busiest day. */
function levelFor(count: number, max: number): HeatCell["level"] {
  if (count <= 0) return 0;
  if (max <= 0) return 1;
  const ratio = count / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

export function buildHeatmap(dates: Array<Date | string>, today: Date, days = 365): Heatmap {
  // Count events per local day.
  const counts = new Map<string, number>();
  for (const d of dates) {
    const key = dayKey(d instanceof Date ? d : new Date(d));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  // Range start: align to the Sunday on/before (today - days + 1) so weeks are full columns.
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const rawStart = addDays(end, -(days - 1));
  const start = addDays(rawStart, -rawStart.getDay()); // back up to Sunday

  let total = 0;
  let activeDays = 0;
  let max = 0;
  for (const [, c] of counts) if (c > max) max = c;

  const weeks: HeatCell[][] = [];
  let cur = start;
  while (cur <= end) {
    const week: HeatCell[] = [];
    for (let i = 0; i < 7; i++) {
      const key = dayKey(cur);
      const inRange = cur >= rawStart && cur <= end;
      const count = inRange ? (counts.get(key) ?? 0) : 0;
      if (inRange && count > 0) {
        total += count;
        activeDays++;
      }
      week.push({ date: key, count, level: levelFor(count, max) });
      cur = addDays(cur, 1);
    }
    weeks.push(week);
  }

  return { weeks, total, activeDays, max };
}
