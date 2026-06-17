import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

/** The learn dashboard is gone | reading KPIs live on the profile now. */
export default async function LearnPage() {
  const me = (await getCurrentUser()) as { id: string; handle?: string | null } | null;
  redirect(me ? routes.user(me.handle || me.id) : routes.home);
}
