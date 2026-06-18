import { describe, expect, it } from "bun:test";

import { dedupeChapters } from "../lib/dedupe-chapters";

const c = (id: string, name: string, dateUpload?: string) => ({ id, name, dateUpload });

describe("dedupeChapters", () => {
  it("collapses the dateless /pdf dupe, keeping the dated reader chapter", () => {
    const out = dedupeChapters([
      c("real-0", "Capítulo 0", "1700000000000"),
      c("pdf-0", "Capítulo 0"), // /pdf dupe, no date
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("real-0");
  });

  it("prefers the dated entry even when the dateless one comes first", () => {
    const out = dedupeChapters([c("pdf-1", "Capítulo 1"), c("real-1", "Capítulo 1", "123")]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("real-1");
  });

  it("keeps distinct numbers (incl. decimals like 10.5)", () => {
    const out = dedupeChapters([
      c("a", "Capítulo 10", "1"),
      c("b", "Capítulo 10.5", "1"),
      c("d", "Capítulo 11", "1"),
    ]);
    expect(out.map((x) => x.id)).toEqual(["a", "b", "d"]);
  });

  it("never collapses unnumbered specials (keys off id)", () => {
    const out = dedupeChapters([c("x", "Extra"), c("y", "Omake")]);
    expect(out).toHaveLength(2);
  });

  it("preserves order", () => {
    const out = dedupeChapters([
      c("a", "Capítulo 3", "1"),
      c("b", "Capítulo 2", "1"),
      c("c", "Capítulo 1", "1"),
    ]);
    expect(out.map((x) => x.name)).toEqual(["Capítulo 3", "Capítulo 2", "Capítulo 1"]);
  });
});
