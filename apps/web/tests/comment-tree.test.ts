import { describe, expect, it } from "bun:test";

import { buildCommentTree } from "../lib/comment-tree";

const c = (id: number, parentId: number | null, createdAt: string) => ({ id, parentId, createdAt });

describe("buildCommentTree", () => {
  it("nests replies under their parent and keeps top-level order", () => {
    const list = [
      c(3, null, "2024-01-03T00:00:00Z"),
      c(1, null, "2024-01-01T00:00:00Z"),
      c(2, 1, "2024-01-02T00:00:00Z"),
    ];
    const tree = buildCommentTree(list);
    expect(tree.map((t) => t.id)).toEqual([3, 1]); // input order preserved
    expect(tree.find((t) => t.id === 1)?.replies.map((r) => r.id)).toEqual([2]);
    expect(tree.find((t) => t.id === 3)?.replies).toEqual([]);
  });

  it("sorts replies oldest-first regardless of input order", () => {
    const list = [
      c(1, null, "2024-01-01T00:00:00Z"),
      c(3, 1, "2024-01-05T00:00:00Z"),
      c(2, 1, "2024-01-02T00:00:00Z"),
    ];
    const replies = buildCommentTree(list)[0].replies;
    expect(replies.map((r) => r.id)).toEqual([2, 3]);
  });

  it("drops orphan replies (parent absent) from the top level", () => {
    const tree = buildCommentTree([c(2, 99, "2024-01-02T00:00:00Z")]);
    expect(tree).toEqual([]);
  });

  it("handles an empty list", () => {
    expect(buildCommentTree([])).toEqual([]);
  });

  it("nests replies recursively (reply to a reply, any depth)", () => {
    const list = [
      c(1, null, "2024-01-01T00:00:00Z"),
      c(2, 1, "2024-01-02T00:00:00Z"),
      c(3, 2, "2024-01-03T00:00:00Z"),
    ];
    const tree = buildCommentTree(list);
    expect(tree[0].id).toBe(1);
    expect(tree[0].replies[0].id).toBe(2);
    expect(tree[0].replies[0].replies[0].id).toBe(3);
  });
});
