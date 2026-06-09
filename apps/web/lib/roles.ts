/**
 * Role helpers — pure, no server-only imports so they're usable from any context
 * (RSC, route handlers, tests). `admin` implies every lower capability.
 */
export type Role = "user" | "staff" | "admin";

export function hasRole(
  user: { role?: string | null } | null | undefined,
  role: "admin" | "staff",
): boolean {
  if (!user?.role) return false;
  if (user.role === "admin") return true;
  return user.role === role;
}
