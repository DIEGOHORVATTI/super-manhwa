import type { Metadata } from "next";

import { OrgManage } from "@/components/org/OrgManage";

export const metadata: Metadata = { title: "Gerenciar organização" };

type Params = Promise<{ id: string }>;

export default async function OrgManagePage({ params }: { params: Params }) {
  const { id } = await params;
  return <OrgManage id={Number(id)} />;
}
