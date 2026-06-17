import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

/** Settings is now a modal on the profile | send any /settings hit there. */
export default async function SettingsPage() {
  const me = (await getCurrentUser()) as { id: string; handle?: string | null } | null;
  redirect(me ? routes.user(me.handle || me.id) : routes.login);
}
