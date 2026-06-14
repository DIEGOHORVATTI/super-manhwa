import { describe, expect, it } from "bun:test";

import { badgesFor, chatBadges } from "../lib/badges";
import { newlyUnlockedReading } from "../lib/reading";

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
