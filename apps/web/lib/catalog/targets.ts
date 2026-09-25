import "server-only";

import { routes } from "@/lib/routes";

import { getChapter, getNovel } from "./index";

export type CommentTarget = { targetType: string; targetId: string };

/** Title + link of what a comment was left on (a novel or one of its chapters). */
export async function resolveTargets(targets: CommentTarget[]) {
  const unique = [...new Map(targets.map((t) => [`${t.targetType}:${t.targetId}`, t])).values()];
  const resolved = await Promise.all(
    unique.map(async ({ targetType, targetId }) => {
      const isNovel = targetType === "work";
      const found = isNovel
        ? await getNovel(targetId).catch(() => null)
        : await getChapter(targetId).catch(() => null);
      return [
        `${targetType}:${targetId}`,
        {
          href: isNovel ? routes.novel(targetId) : routes.read(targetId),
          title: found?.title ?? null,
        },
      ] as const;
    }),
  );
  const byKey = new Map(resolved);
  return (target: CommentTarget) => byKey.get(`${target.targetType}:${target.targetId}`)!;
}
