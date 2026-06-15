import { describe, expect, it } from "bun:test";
import {
  mergeChapters,
  parseChapterNumber,
  titleMatches,
} from "@/modules/catalog/application/completeness";
import type { Chapter } from "@/modules/catalog/domain/manga";

const ch = (id: string, name: string, lang: string): Chapter => ({ id, name, lang });

describe("parseChapterNumber", () => {
  it("extracts the chapter number across formats", () => {
    expect(parseChapterNumber("Vol.1 Ch.5 The Title")).toBe(5);
    expect(parseChapterNumber("Ch.5")).toBe(5);
    expect(parseChapterNumber("Capítulo 5")).toBe(5);
    expect(parseChapterNumber("Cap. 5.1")).toBe(5.1);
    expect(parseChapterNumber("Chapter 10")).toBe(10);
    expect(parseChapterNumber("#42")).toBe(42);
    expect(parseChapterNumber("Vol.2 Ch.10,5 End")).toBe(10.5);
    expect(parseChapterNumber("7")).toBe(7);
  });

  it("returns undefined for oneshots/specials", () => {
    expect(parseChapterNumber("Oneshot")).toBeUndefined();
    expect(parseChapterNumber("Extra")).toBeUndefined();
  });

  it("ignores the volume number when no chapter marker disambiguates", () => {
    expect(parseChapterNumber("Vol.3 The Beginning")).toBeUndefined();
  });
});

describe("titleMatches", () => {
  const targets = ["Solo Leveling", "I Level Up Alone", "Ore dake Level Up na Ken"];

  it("matches exact and article-insensitive titles", () => {
    expect(titleMatches("Solo Leveling", targets)).toBe(true);
    expect(titleMatches("The Apothecary Diaries", ["Apothecary Diaries"])).toBe(true);
  });

  it("matches via a cross-language alias", () => {
    expect(titleMatches("I Level Up Alone", targets)).toBe(true);
  });

  it("rejects sequels/spin-offs (too low overlap)", () => {
    expect(titleMatches("Solo Leveling: Ragnarok", ["Solo Leveling"])).toBe(false);
  });

  it("rejects unrelated titles", () => {
    expect(titleMatches("Naruto", targets)).toBe(false);
  });
});

describe("mergeChapters", () => {
  it("unions across sources, deduping by chapter number", () => {
    const merged = mergeChapters(
      [
        {
          lang: "pt-br",
          priority: 0,
          chapters: [ch("a3", "Cap. 3", "pt-br"), ch("a2", "Cap. 2", "pt-br")],
        },
        {
          lang: "en",
          priority: 1,
          chapters: [ch("b3", "Ch.3", "en"), ch("b2", "Ch.2", "en"), ch("b1", "Ch.1", "en")],
        },
      ],
      "pt-br",
    );
    // 3,2 from pt-br + 1 from en | sorted desc, no duplicate 2/3.
    expect(merged.map((c) => c.id)).toEqual(["a3", "a2", "b1"]);
  });

  it("prefers the primary language for a duplicated chapter regardless of priority order", () => {
    const merged = mergeChapters(
      [
        { lang: "en", priority: 0, chapters: [ch("en5", "Ch.5", "en")] },
        { lang: "pt-br", priority: 5, chapters: [ch("pt5", "Cap. 5", "pt-br")] },
      ],
      "pt-br",
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("pt5");
    expect(merged[0].lang).toBe("pt-br");
  });

  it("keeps unparseable chapters, deduped by name", () => {
    const merged = mergeChapters(
      [
        { lang: "pt-br", priority: 0, chapters: [ch("o1", "Oneshot", "pt-br")] },
        {
          lang: "en",
          priority: 1,
          chapters: [ch("o2", "Oneshot", "en"), ch("x", "Especial", "en")],
        },
      ],
      "pt-br",
    );
    expect(merged.map((c) => c.id).sort()).toEqual(["o1", "x"]);
  });
});
