import { describe, expect, it } from "bun:test";

import { computeAccess } from "../lib/perms";

describe("computeAccess — work authorization matrix", () => {
  it("owner gets every capability", () => {
    const a = computeAccess(null, true);
    expect(a).toEqual({
      isOwner: true,
      role: "owner",
      canEditWork: true,
      canManageTeam: true,
      canPublish: true,
      canReview: true,
      canEditChapters: true,
    });
  });

  it("editor manages chapters + publishes + reviews, but not the team", () => {
    const a = computeAccess("editor", false);
    expect(a.canEditWork).toBe(true);
    expect(a.canEditChapters).toBe(true);
    expect(a.canPublish).toBe(true);
    expect(a.canReview).toBe(true);
    expect(a.canManageTeam).toBe(false);
    expect(a.isOwner).toBe(false);
  });

  it("translator only drafts/edits chapters", () => {
    const a = computeAccess("translator", false);
    expect(a.canEditChapters).toBe(true);
    expect(a.canReview).toBe(false);
    expect(a.canPublish).toBe(false);
    expect(a.canEditWork).toBe(false);
    expect(a.canManageTeam).toBe(false);
  });

  it("reviewer only reviews", () => {
    const a = computeAccess("reviewer", false);
    expect(a.canReview).toBe(true);
    expect(a.canEditChapters).toBe(false);
    expect(a.canPublish).toBe(false);
    expect(a.canEditWork).toBe(false);
  });

  it("no role = no access", () => {
    const a = computeAccess(null, false);
    expect(a.role).toBeNull();
    expect(a.canReview).toBe(false);
    expect(a.canEditChapters).toBe(false);
    expect(a.canPublish).toBe(false);
    expect(a.canManageTeam).toBe(false);
  });

  it("owner flag wins even with a narrow role passed", () => {
    expect(computeAccess("translator", true).canManageTeam).toBe(true);
  });
});
