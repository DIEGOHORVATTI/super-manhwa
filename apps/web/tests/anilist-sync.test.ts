import { describe, expect, it } from "bun:test";

import { planFavouritesSync } from "../lib/anilist-sync";

describe("planFavouritesSync", () => {
  it("pulls remote-only and pushes local-only, leaving shared ids untouched", () => {
    const local = [{ id: "1" }, { id: "2" }];
    const remote = [{ id: "2" }, { id: "3" }];
    const plan = planFavouritesSync(local, remote);
    expect(plan.toAddLocally).toEqual(["3"]); // remote-only → import
    expect(plan.toAddRemote).toEqual(["1"]); // local-only → push
  });

  it("is a no-op when both sides already match", () => {
    const both = [{ id: "1" }, { id: "2" }];
    const plan = planFavouritesSync(both, [...both]);
    expect(plan.toAddLocally).toEqual([]);
    expect(plan.toAddRemote).toEqual([]);
  });

  it("handles empty sides (first connect)", () => {
    expect(planFavouritesSync([], [{ id: "9" }])).toEqual({
      toAddLocally: ["9"],
      toAddRemote: [],
    });
    expect(planFavouritesSync([{ id: "9" }], [])).toEqual({
      toAddLocally: [],
      toAddRemote: ["9"],
    });
  });
});
