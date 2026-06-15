import type { Metadata } from "next";

import { ChapterReader } from "@/components/studio/ChapterReader";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Preview do capítulo", robots: { index: false } };

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>;
}) {
  const { id, chapterId } = await params;
  return <ChapterReader chapterId={Number(chapterId)} backHref={routes.studioWork(id)} preview />;
}
