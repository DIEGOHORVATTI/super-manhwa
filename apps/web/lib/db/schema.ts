import { integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * The only server-side state the app keeps (everything else is stateless /
 * localStorage). Lives in the Next app's Postgres (Neon) via Drizzle — the
 * reading/catalog backend stays untouched. Used by the legal forms, the
 * newsletter and web-push.
 */

/** Newsletter subscribers (double opt-in). */
export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  /** pending → confirmed (via e-mailed token) → unsubscribed. */
  status: text("status").notNull().default("pending"),
  token: text("token").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** DMCA takedown + contact submissions (payload is a JSON blob). */
export const legalRequests = pgTable("legal_requests", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "dmca" | "contact"
  payload: text("payload").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Web-push endpoints (one per browser that opted in). */
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Which works a push subscription wants new-chapter alerts for. */
export const pushFollows = pgTable(
  "push_follows",
  {
    id: serial("id").primaryKey(),
    subscriptionId: integer("subscription_id").notNull(),
    mangaId: text("manga_id").notNull(),
  },
  (t) => [uniqueIndex("push_follow_uniq").on(t.subscriptionId, t.mangaId)],
);

/** Last-seen latest chapter per followed work, for new-chapter detection. */
export const workState = pgTable("work_state", {
  mangaId: text("manga_id").primaryKey(),
  lastChapterKey: text("last_chapter_key"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
