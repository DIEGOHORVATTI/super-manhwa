import type { Metadata } from "next";

import { OrgInviteAccept } from "@/components/org/OrgInviteAccept";

export const metadata: Metadata = { title: "Convite | Organização" };

type Params = Promise<{ token: string }>;

export default async function OrgInvitePage({ params }: { params: Params }) {
  const { token } = await params;
  return <OrgInviteAccept token={token} />;
}
