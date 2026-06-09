import type { Metadata } from "next";

import { NovelReader } from "@/components/learn/NovelReader";

export const metadata: Metadata = { title: "Leitura com aprendizado" };

export default async function LearnReaderPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = await params;
  return <NovelReader chapterId={Number(chapterId)} />;
}
