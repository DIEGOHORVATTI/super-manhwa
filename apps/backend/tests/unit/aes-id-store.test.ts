import { describe, expect, it } from "bun:test";

import { makeAesIdStore } from "@/core/infra/aes-id-store";

const store = makeAesIdStore({ secret: "test-secret" });

describe("aes id store", () => {
  it("round-trips source + url", () => {
    const ref = { source: "comick-ptbr", url: "/comic/solo-leveling/ch-100-pt-br" };
    const id = store.encode(ref);
    expect(store.decode(id)).toEqual(ref);
  });

  it("is deterministic (same input → same id)", () => {
    const ref = { source: "anilist", url: "https://s4.anilist.co/x.jpg" };
    expect(store.encode(ref)).toBe(store.encode(ref));
  });

  it("rejects tampered / garbage ids", () => {
    expect(store.decode("not-a-real-token")).toBeNull();
    const id = store.encode({ source: "s", url: "u" });
    expect(store.decode(`${id}xyz`)).toBeNull();
  });

  it("a different secret cannot decode another's ids", () => {
    const id = store.encode({ source: "s", url: "u" });
    expect(makeAesIdStore({ secret: "other" }).decode(id)).toBeNull();
  });
});
