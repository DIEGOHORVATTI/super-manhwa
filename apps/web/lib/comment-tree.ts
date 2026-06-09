/**
 * Pure comment-threading logic, extracted from the Comments component so the
 * nesting/ordering rules can be unit-tested. Top-level comments keep their input
 * order (the API returns newest-first); replies are sorted oldest-first for
 * natural reading order.
 */
export interface CommentNode {
  id: number;
  parentId: number | null;
  createdAt: string;
}

export type WithReplies<T extends CommentNode> = T & { replies: T[] };

export function buildCommentTree<T extends CommentNode>(list: T[]): WithReplies<T>[] {
  const top = list.filter((c) => c.parentId == null);
  const byParent = new Map<number, T[]>();
  for (const c of list) {
    if (c.parentId != null) {
      const arr = byParent.get(c.parentId) ?? [];
      arr.push(c);
      byParent.set(c.parentId, arr);
    }
  }
  return top.map((c) => ({
    ...c,
    replies: (byParent.get(c.id) ?? []).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    ),
  }));
}
