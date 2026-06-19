import { describe, expect, it } from "bun:test";

import { applyCatalog, badgesFor, chatBadges, type TagOverride } from "../lib/badges";
import { newlyUnlockedReading } from "../lib/reading";

describe("applyCatalog", () => {
  it("overlays catalog label/emoji/color by key and keeps unmatched badges", () => {
    const map = new Map<string, TagOverride>([
      ["admin", { key: "admin", label: "Chefe", emoji: "👑", color: "#fff" }],
    ]);
    const out = applyCatalog(badgesFor({ role: "admin", plan: "premium" }), map);
    expect(out.find((b) => b.key === "admin")).toMatchObject({
      label: "Chefe",
      emoji: "👑",
      color: "#fff",
    });
    expect(out.find((b) => b.key === "premium")?.label).toBe("Premium");
  });

  it("keeps the code default when a catalog field is null/empty", () => {
    const map = new Map<string, TagOverride>([
      ["premium", { key: "premium", label: "", emoji: null, color: null }],
    ]);
    const out = applyCatalog(badgesFor({ plan: "premium" }), map);
    expect(out[0].label).toBe("Premium");
  });
});

describe("badgesFor", () => {
  it("maps admin/staff role to a single status badge", () => {
    expect(badgesFor({ role: "admin" }).map((b) => b.key)).toEqual(["admin"]);
    expect(badgesFor({ role: "staff" }).map((b) => b.key)).toEqual(["staff"]);
    expect(badgesFor({ role: "user" })).toEqual([]);
  });

  it("adds a premium badge for premium plan", () => {
    const b = badgesFor({ role: "user", plan: "premium" });
    expect(b.map((x) => x.key)).toEqual(["premium"]);
  });

  it("includes known achievements and ignores unknown keys", () => {
    const b = badgesFor({ achievements: ["words_100", "read_10_works", "bogus"] });
    expect(b.map((x) => x.key)).toEqual(["words_100", "read_10_works"]);
    expect(b.find((x) => x.key === "read_10_works")?.tone).toBe("reading");
  });

  it("orders status badges before achievements", () => {
    const b = badgesFor({ role: "admin", plan: "premium", achievements: ["words_100"] });
    expect(b.map((x) => x.key)).toEqual(["admin", "premium", "words_100"]);
  });

  it("adds only the highest reputation tier reached", () => {
    expect(badgesFor({ reputation: 50 }).find((b) => b.key === "rep")).toBeUndefined();
    expect(badgesFor({ reputation: 600 }).find((b) => b.key === "rep")?.label).toBe("Veterano");
    expect(badgesFor({ reputation: 5000 }).find((b) => b.key === "rep")?.label).toBe("Onisciente");
  });

  it("adds comment-count tier and early-adopter by createdAt", () => {
    expect(badgesFor({ commentsCount: 60 }).find((b) => b.key === "keyboard-warrior")?.label).toBe(
      "Comentarista",
    );
    expect(badgesFor({ commentsCount: 250 }).find((b) => b.key === "keyboard-warrior")?.label).toBe(
      "Guerreiro do Teclado",
    );
    expect(badgesFor({ createdAt: "2026-01-01" }).some((b) => b.key === "early-adopter")).toBe(
      true,
    );
    expect(badgesFor({ createdAt: "2030-01-01" }).some((b) => b.key === "early-adopter")).toBe(
      false,
    );
  });
});

describe("chatBadges", () => {
  it("keeps only status tones (admin/staff/premium)", () => {
    expect(chatBadges({ role: "staff", plan: "premium" }).map((b) => b.key)).toEqual([
      "staff",
      "premium",
    ]);
  });
});

describe("newlyUnlockedReading", () => {
  it("unlocks at thresholds and not twice", () => {
    expect(newlyUnlockedReading({ works: 10, chapters: 100 }, new Set()).sort()).toEqual(
      ["read_100_chapters", "read_10_works"].sort(),
    );
    expect(
      newlyUnlockedReading(
        { works: 10, chapters: 100 },
        new Set(["read_10_works", "read_100_chapters"]),
      ),
    ).toEqual([]);
  });

  it("stays empty below thresholds", () => {
    expect(newlyUnlockedReading({ works: 3, chapters: 5 }, new Set())).toEqual([]);
  });
});
