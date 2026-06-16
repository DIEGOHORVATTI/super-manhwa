import { describe, expect, it } from "bun:test";

import { buildHeatmap } from "../lib/heatmap";

const today = new Date(2026, 5, 16); // 2026-06-16 (local)

describe("buildHeatmap", () => {
  it("buckets events by day and totals them", () => {
    const hm = buildHeatmap(
      [new Date(2026, 5, 16), new Date(2026, 5, 16), new Date(2026, 5, 15)],
      today,
      30,
    );
    expect(hm.total).toBe(3);
    expect(hm.activeDays).toBe(2);
    expect(hm.max).toBe(2);
  });

  it("ignores events outside the range", () => {
    const hm = buildHeatmap([new Date(2020, 0, 1)], today, 30);
    expect(hm.total).toBe(0);
    expect(hm.activeDays).toBe(0);
  });

  it("lays out full week columns of 7 days (Sun→Sat)", () => {
    const hm = buildHeatmap([], today, 365);
    expect(hm.weeks.every((w) => w.length === 7)).toBe(true);
    // First cell of the first column is a Sunday.
    expect(new Date(hm.weeks[0][0].date).getDay()).toBe(0);
  });

  it("assigns intensity levels relative to the busiest day", () => {
    const dates = [
      ...Array(4).fill(new Date(2026, 5, 16)), // busiest = 4
      new Date(2026, 5, 14), // 1 → low level
    ];
    const hm = buildHeatmap(dates, today, 30);
    const busy = hm.weeks.flat().find((c) => c.date === "2026-06-16");
    const light = hm.weeks.flat().find((c) => c.date === "2026-06-14");
    expect(busy?.level).toBe(4);
    expect(light?.level).toBe(1);
  });
});
