/**
 * Pure comment-threading logic, extracted from the Comments component so the
 * nesting/ordering rules can be unit-tested. Top-level comments keep their input
 * order (the API returns newest-first); replies are sorted oldest-first for
 * natural reading order.
 */
export interface CommentNode {
  id: number;
  parentId: number | null;
  createdAt: string | Date;
}

export type WithReplies<T extends CommentNode> = T & { replies: WithReplies<T>[] };

/**
 * Build a FULL reply tree (any depth) from a flat list. Top-level comments keep
 * input order (newest-first); replies at every level are oldest-first. Safe
 * against cycles since a reply's `parentId` always references an earlier comment.
 */
export function buildCommentTree<T extends CommentNode>(list: T[]): WithReplies<T>[] {
  const byParent = new Map<number | null, T[]>();
  for (const c of list) {
    const key = c.parentId ?? null;
    const arr = byParent.get(key) ?? [];
    arr.push(c);
    byParent.set(key, arr);
  }
  const oldestFirst = (a: T, b: T) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

  const build = (parentId: number | null, sort: boolean): WithReplies<T>[] => {
    const children = byParent.get(parentId) ?? [];
    const ordered = sort ? [...children].sort(oldestFirst) : children;
    return ordered.map((c) => ({ ...c, replies: build(c.id, true) }));
  };
  return build(null, false); // top-level keeps the API's newest-first order
}
