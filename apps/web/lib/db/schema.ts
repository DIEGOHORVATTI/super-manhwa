import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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

/* ───────────────────────────── Auth (Better Auth) ─────────────────────────────
 * Table + column names match Better Auth's core schema so the Drizzle adapter
 * maps with no custom field overrides. IDs are text (Better Auth generates them).
 * `role` is an app extension (defaults to "user"; "staff"/"admin" gate panels).
 */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /** Public handle for /u/[handle]; nullable until chosen (defaults to id). */
  handle: text("handle").unique(),
  bio: text("bio"),
  role: text("role").notNull().default("user"), // user | staff | admin
  banned: boolean("banned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Linked credentials & OAuth identities. One user can hold many rows, including
 * several `providerId = "anilist"` links (multiple AniList accounts) alongside
 * "google" and the email/password "credential" row.
 */
export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("account_provider_uniq").on(t.providerId, t.accountId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ───────────────────────────── Comments ─────────────────────────────
 * Native threaded comments (replaces Disqus). A comment targets either a work
 * or a specific chapter, identified by the opaque catalog id used in routes.
 */
export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(), // work | chapter
    targetId: text("target_id").notNull(),
    parentId: integer("parent_id"), // self-ref thread; null = top-level
    body: text("body").notNull(),
    score: integer("score").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    editedAt: timestamp("edited_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [index("comments_target_idx").on(t.targetType, t.targetId)],
);

export const commentVotes = pgTable(
  "comment_votes",
  {
    id: serial("id").primaryKey(),
    commentId: integer("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    value: integer("value").notNull(), // -1 | 1
  },
  (t) => [uniqueIndex("comment_vote_uniq").on(t.commentId, t.userId)],
);

/* ───────────────────────────── Donations (Pix / Mercado Pago) ───────────────────────────── */
export const donations = pgTable("donations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }), // null = anônimo
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("BRL"),
  provider: text("provider").notNull().default("mercadopago"),
  providerPaymentId: text("provider_payment_id"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  pixQr: text("pix_qr"), // copia-e-cola
  pixQrBase64: text("pix_qr_base64"), // imagem do QR
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ───────────────────────────── User-generated works & teams ─────────────────────────────
 * Original works posted to the platform (distinct from connector catalog works).
 * Teams grant collaborators scoped roles; chapters move through a draft → review
 * → scheduled → published lifecycle with pages stored in R2.
 */
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const teamMembers = pgTable(
  "team_members",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("translator"), // owner | editor | translator | reviewer
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("team_member_uniq").on(t.teamId, t.userId)],
);

export const userWorks = pgTable(
  "user_works",
  {
    id: serial("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    teamId: integer("team_id").references(() => teams.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    synopsis: text("synopsis"),
    coverR2Key: text("cover_r2_key"),
    status: text("status").notNull().default("draft"), // draft | pending | published
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("user_works_owner_idx").on(t.ownerId)],
);

export const userChapters = pgTable(
  "user_chapters",
  {
    id: serial("id").primaryKey(),
    workId: integer("work_id")
      .notNull()
      .references(() => userWorks.id, { onDelete: "cascade" }),
    number: text("number").notNull(),
    title: text("title"),
    status: text("status").notNull().default("draft"), // draft | in_review | scheduled | published
    scheduledAt: timestamp("scheduled_at"),
    reviewedBy: text("reviewed_by").references(() => user.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("user_chapters_work_idx").on(t.workId)],
);

export const chapterPages = pgTable(
  "chapter_pages",
  {
    id: serial("id").primaryKey(),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => userChapters.id, { onDelete: "cascade" }),
    index: integer("index").notNull(),
    r2Key: text("r2_key").notNull(),
  },
  (t) => [uniqueIndex("chapter_page_uniq").on(t.chapterId, t.index)],
);

export const chapterReviews = pgTable("chapter_reviews", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id")
    .notNull()
    .references(() => userChapters.id, { onDelete: "cascade" }),
  reviewerId: text("reviewer_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  decision: text("decision").notNull(), // approved | changes_requested
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ───────────────────────────── Connector cache-on-read (DB + R2) ─────────────────────────────
 * First view of a connector work persists its merged metadata/chapters here and
 * mirrors cover/page images to R2, so repeat visits are instant and survive the
 * upstream source going down. `refreshedAt` drives background revalidation.
 */
export const cachedWorks = pgTable("cached_works", {
  catalogId: text("catalog_id").primaryKey(),
  title: text("title").notNull(),
  payloadJson: text("payload_json").notNull(), // serialized core + meta
  coverR2Key: text("cover_r2_key"),
  refreshedAt: timestamp("refreshed_at").notNull().defaultNow(),
});

export const cachedChapters = pgTable(
  "cached_chapters",
  {
    id: serial("id").primaryKey(),
    catalogId: text("catalog_id").notNull(),
    chapterKey: text("chapter_key").notNull(),
    payloadJson: text("payload_json").notNull(),
    refreshedAt: timestamp("refreshed_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("cached_chapter_uniq").on(t.catalogId, t.chapterKey)],
);

export const cachedPages = pgTable(
  "cached_pages",
  {
    id: serial("id").primaryKey(),
    chapterId: text("chapter_id").notNull(),
    index: integer("index").notNull(),
    r2Key: text("r2_key").notNull(),
    sourceUrl: text("source_url"),
  },
  (t) => [uniqueIndex("cached_page_uniq").on(t.chapterId, t.index)],
);
