import type { Metadata } from "next";

import { ChapterReader } from "@/components/studio/ChapterReader";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Leitor" };

export default async function ObraChapterPage({
  params,
}: {
  params: Promise<{ slug: string; chapterId: string }>;
}) {
  const { slug, chapterId } = await params;
  return <ChapterReader chapterId={Number(chapterId)} backHref={routes.obra(slug)} />;
}
