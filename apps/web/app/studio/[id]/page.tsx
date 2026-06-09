import type { Metadata } from "next";

import { StudioWork } from "@/components/studio/StudioWork";

export const metadata: Metadata = { title: "Gerenciar obra" };

export default async function StudioWorkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudioWork workId={Number(id)} />;
}
