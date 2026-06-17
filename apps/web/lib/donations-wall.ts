import "server-only";
import { and, desc, eq } from "drizzle-orm";

import { dbEnabled, getDb, schema } from "@/lib/db";

export type WallDonation = {
  id: number;
  amountCents: number;
  message: string | null;
  name: string;
  image: string | null;
  handle: string | null;
  createdAt: Date;
};

/**
 * Approved, non-hidden donations newest-first for the public wall. Donor name is
 * the chosen display name, else the account name, else "Anônimo". Returns [] when
 * the DB is unconfigured.
 */
export async function loadDonationWall(limit = 20): Promise<WallDonation[]> {
  if (!dbEnabled) return [];
  try {
    const db = getDb();
    const { donations, user } = schema;
    const rows = await db
      .select({
        id: donations.id,
        amountCents: donations.amountCents,
        message: donations.message,
        displayName: donations.displayName,
        createdAt: donations.createdAt,
        userName: user.name,
        userImage: user.image,
        userHandle: user.handle,
      })
      .from(donations)
      .leftJoin(user, eq(donations.userId, user.id))
      .where(and(eq(donations.status, "approved"), eq(donations.hidden, false)))
      .orderBy(desc(donations.createdAt))
      .limit(limit);

    return rows.map((r) => {
      // "Anônimo" donors show no avatar/link even if signed in; an attributed
      // account shows its name + avatar + profile link.
      const anon = r.displayName === "Anônimo";
      return {
        id: r.id,
        amountCents: r.amountCents,
        message: r.message,
        name: r.displayName || r.userName || "Anônimo",
        image: anon ? null : (r.userImage ?? null),
        handle: anon ? null : (r.userHandle ?? null),
        createdAt: r.createdAt,
      };
    });
  } catch {
    return [];
  }
}
