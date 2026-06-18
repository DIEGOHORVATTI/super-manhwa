import { describe, expect, it } from "bun:test";

import type { WorkFormat } from "@packages/contracts";
import { mergeSummaries } from "@/modules/catalog/application/connector-search";
import type { MangaSummary } from "@/modules/catalog/domain/manga";

const s = (name: string, id = name, format?: WorkFormat): MangaSummary => ({
  id,
  name,
  lang: "pt-br",
  format,
});

describe("mergeSummaries", () => {
  it("ranks exact/prefix title matches above AniList fuzzy noise", () => {
    const anilist = [s("ATOM: The Beginning"), s("Masca: The Beginning")];
    const connector = [s("The Beginning After The End")];
    const out = mergeSummaries("the beginning", anilist, connector, 10);
    expect(out[0].name).toBe("The Beginning After The End"); // prefix match wins
  });

  it("dedupes by normalized title, keeping the AniList copy", () => {
    const anilist = [s("Solo Leveling", "anilist-1")];
    const connector = [s("solo leveling", "connector-1")];
    const out = mergeSummaries("solo leveling", anilist, connector, 10);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("anilist-1");
  });

  it("groups a novel '(Book Version)' into its image edition, badging both formats", () => {
    const anilist = [s("Solo Leveling", "anilist-1")];
    const connector = [s("Solo Leveling (Book Version)", "novel-1", "novel")];
    const out = mergeSummaries("solo leveling", anilist, connector, 10);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("anilist-1"); // image edition is the shown row
    expect(out[0].formats).toEqual(["manga", "novel"]);
  });

  it("keeps a novel-only work (nothing readable is dropped)", () => {
    const out = mergeSummaries("lord of mysteries", [], [s("Lord of Mysteries", "n", "novel")], 10);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("n");
    expect(out[0].formats).toBeUndefined(); // single format → no badge
  });

  it("does NOT group sequels/side-stories (only format markers strip)", () => {
    const anilist = [s("Solo Leveling"), s("Solo Leveling: Ragnarok")];
    const out = mergeSummaries("solo leveling", anilist, [], 10);
    expect(out).toHaveLength(2);
  });

  it("respects the limit", () => {
    const anilist = [s("a"), s("b"), s("c")];
    expect(mergeSummaries("x", anilist, [s("d")], 2)).toHaveLength(2);
  });
});
