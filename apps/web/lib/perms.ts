import "server-only";
import { and, eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";

/**
 * Team/work authorization. A work is owned by a user and optionally bound to a
 * team; collaborators get a scoped role. Capabilities:
 *
 *   owner     — everything (edit work, manage team, publish, delete)
 *   editor    — manage chapters, schedule, publish, edit work metadata
 *   reviewer  — review chapters (approve / request changes)
 *   translator— create/edit chapter drafts, submit for review
 *
 * The owner of the work always has full rights regardless of team role.
 */
export type TeamRole = "owner" | "editor" | "translator" | "reviewer";

export interface WorkAccess {
  isOwner: boolean;
  role: TeamRole | null;
  canEditWork: boolean;
  canManageTeam: boolean;
  canPublish: boolean;
  canReview: boolean;
  canEditChapters: boolean;
}

const NONE: WorkAccess = {
  isOwner: false,
  role: null,
  canEditWork: false,
  canManageTeam: false,
  canPublish: false,
  canReview: false,
  canEditChapters: false,
};

/**
 * Pure capability mapping for a resolved role. Extracted so the authorization
 * matrix can be unit-tested without a database. `isOwner` always grants full
 * rights; team roles get a narrower slice.
 */
export function computeAccess(role: TeamRole | null, isOwner: boolean): WorkAccess {
  if (isOwner) {
    return {
      isOwner: true,
      role: "owner",
      canEditWork: true,
      canManageTeam: true,
      canPublish: true,
      canReview: true,
      canEditChapters: true,
    };
  }
  if (!role) return NONE;
  return {
    isOwner: false,
    role,
    canEditWork: role === "editor",
    canManageTeam: false,
    canPublish: role === "editor",
    canReview: role === "editor" || role === "reviewer",
    canEditChapters: role === "editor" || role === "translator",
  };
}

/** Resolve a user's effective access to a given work. */
export async function getWorkAccess(workId: number, userId: string | null): Promise<WorkAccess> {
  if (!userId) return NONE;
  const db = getDb();
  const { userWorks, teamMembers } = schema;

  const [work] = await db
    .select({ ownerId: userWorks.ownerId, teamId: userWorks.teamId })
    .from(userWorks)
    .where(eq(userWorks.id, workId))
    .limit(1);
  if (!work) return NONE;
  if (work.ownerId === userId) return computeAccess(null, true);

  if (!work.teamId) return NONE;
  const [member] = await db
    .select({ role: teamMembers.role })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, work.teamId), eq(teamMembers.userId, userId)))
    .limit(1);
  if (!member) return NONE;

  return computeAccess(member.role as TeamRole, false);
}
