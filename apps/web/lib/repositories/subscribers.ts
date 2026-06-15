import "server-only";
import { eq } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";

/**
 * Data access for newsletter subscribers | the only place that touches the
 * `subscribers` table (mirrors the backend's infrastructure layer). Services
 * call these; routes never query Drizzle directly.
 */
export type Subscriber = typeof schema.subscribers.$inferSelect;
export type SubscriberStatus = "pending" | "confirmed" | "unsubscribed";

export const subscribersRepo = {
  byEmail(email: string): Promise<Subscriber | undefined> {
    return getDb()
      .select()
      .from(schema.subscribers)
      .where(eq(schema.subscribers.email, email))
      .then((rows) => rows[0]);
  },

  byToken(token: string): Promise<Subscriber | undefined> {
    return getDb()
      .select()
      .from(schema.subscribers)
      .where(eq(schema.subscribers.token, token))
      .then((rows) => rows[0]);
  },

  async upsertPending(email: string, token: string): Promise<void> {
    const db = getDb();
    const existing = await this.byEmail(email);
    if (existing) {
      await db
        .update(schema.subscribers)
        .set({ token, status: "pending" })
        .where(eq(schema.subscribers.email, email));
    } else {
      await db.insert(schema.subscribers).values({ email, token, status: "pending" });
    }
  },

  async setStatus(id: number, status: SubscriberStatus): Promise<void> {
    await getDb().update(schema.subscribers).set({ status }).where(eq(schema.subscribers.id, id));
  },

  listConfirmed(): Promise<Subscriber[]> {
    return getDb()
      .select()
      .from(schema.subscribers)
      .where(eq(schema.subscribers.status, "confirmed"));
  },
};
