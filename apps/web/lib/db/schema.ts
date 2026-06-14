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
  // Language-learning profile (gamification + plan).
  xp: integer("xp").notNull().default(0),
  streakDays: integer("streak_days").notNull().default(0),
  lastStudyDate: text("last_study_date"), // YYYY-MM-DD (user local day)
  dailyGoal: integer("daily_goal").notNull().default(20),
  plan: text("plan").notNull().default("free"), // free | premium
  premiumUntil: timestamp("premium_until"),
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
    kind: text("kind").notNull().default("manga"), // manga (image) | novel (text)
    language: text("language"), // ISO code for novels (pt | en | …) — drives the learning layer
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("user_works_owner_idx").on(t.ownerId)],
);

/** Raw text of a novel chapter (one row per text chapter). */
export const chapterTexts = pgTable("chapter_texts", {
  chapterId: integer("chapter_id")
    .primaryKey()
    .references(() => userChapters.id, { onDelete: "cascade" }),
  language: text("language").notNull(),
  content: text("content").notNull(),
});

/** Pre-computed tokenization of a text chapter (cached at save, not at read). */
export const chapterTokens = pgTable(
  "chapter_tokens",
  {
    id: serial("id").primaryKey(),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => userChapters.id, { onDelete: "cascade" }),
    idx: integer("idx").notNull(), // position in the chapter
    sentenceIdx: integer("sentence_idx").notNull(),
    surface: text("surface").notNull(), // as displayed
    lemma: text("lemma"), // dictionary form (null for non-words)
    reading: text("reading"), // furigana/pinyin (future langs)
    isWord: boolean("is_word").notNull().default(true), // false = punctuation/space
  },
  (t) => [index("chapter_tokens_chapter_idx").on(t.chapterId)],
);

/** Sentences extracted from a text chapter (for cloze + sentence mining). */
export const sentences = pgTable(
  "sentences",
  {
    id: serial("id").primaryKey(),
    chapterId: integer("chapter_id")
      .notNull()
      .references(() => userChapters.id, { onDelete: "cascade" }),
    idx: integer("idx").notNull(),
    text: text("text").notNull(),
  },
  (t) => [uniqueIndex("sentence_chapter_idx_uniq").on(t.chapterId, t.idx)],
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

/* ───────────────────────── Language learning — vocabulary & SRS ─────────────────────────
 * Determinístico, sem IA: tokens → dicionário (words) → estado por usuário (userWords, FSRS)
 * → revisão (srsCards/reviewLogs). Ver docs/language-learning-plan.md.
 */

/** A dictionary headword for a language (deduped by lemma). */
export const words = pgTable(
  "words",
  {
    id: serial("id").primaryKey(),
    language: text("language").notNull(),
    lemma: text("lemma").notNull(),
    reading: text("reading"),
    frequency: integer("frequency"), // rank (lower = more common); null = unknown
    definition: text("definition"), // gloss/translation (from static dictionary)
  },
  (t) => [uniqueIndex("word_lang_lemma_uniq").on(t.language, t.lemma)],
);

/** Per-user knowledge of a word + FSRS scheduling state. */
export const userWords = pgTable(
  "user_words",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    wordId: integer("word_id")
      .notNull()
      .references(() => words.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("new"), // new | learning | known | ignored
    // FSRS state
    stability: integer("stability").notNull().default(0), // x1000 (store as int to avoid float)
    difficulty: integer("difficulty").notNull().default(0), // x1000
    due: timestamp("due"),
    reps: integer("reps").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    lastReviewedAt: timestamp("last_reviewed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_word_uniq").on(t.userId, t.wordId)],
);

/** A review item (cloze from a real sentence, or a mined sentence). */
export const srsCards = pgTable(
  "srs_cards",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    userWordId: integer("user_word_id").references(() => userWords.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("cloze"), // cloze | sentence
    sentenceId: integer("sentence_id").references(() => sentences.id, { onDelete: "set null" }),
    front: text("front").notNull(),
    back: text("back").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("srs_cards_user_idx").on(t.userId)],
);

/** Immutable log of each review — the FSRS input history. */
export const reviewLogs = pgTable("review_logs", {
  id: serial("id").primaryKey(),
  cardId: integer("card_id")
    .notNull()
    .references(() => srsCards.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1 again | 2 hard | 3 good | 4 easy
  stability: integer("stability").notNull(), // x1000 snapshot
  difficulty: integer("difficulty").notNull(), // x1000 snapshot
  reviewedAt: timestamp("reviewed_at").notNull().defaultNow(),
});

/* ───────────────────────── Gamification, daily limits & plan ───────────────────────── */

/** Per-user-per-day counters — drive streak, daily goal and freemium limits. */
export const dailyActivity = pgTable(
  "daily_activity",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD
    newWords: integer("new_words").notNull().default(0),
    reviews: integer("reviews").notNull().default(0),
    xp: integer("xp").notNull().default(0),
  },
  (t) => [uniqueIndex("daily_activity_uniq").on(t.userId, t.date)],
);

export const achievements = pgTable("achievements", {
  key: text("key").primaryKey(), // e.g. words_100
  name: text("name").notNull(),
  description: text("description").notNull(),
});

export const userAchievements = pgTable(
  "user_achievements",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    achievementKey: text("achievement_key")
      .notNull()
      .references(() => achievements.key, { onDelete: "cascade" }),
    unlockedAt: timestamp("unlocked_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_achievement_uniq").on(t.userId, t.achievementKey)],
);

/** Recurring premium subscription (Mercado Pago preapproval). */
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("mercadopago"),
  providerSubId: text("provider_sub_id"),
  status: text("status").notNull().default("pending"), // pending | authorized | paused | cancelled
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** A user read a chapter — drives reading badges (distinct works + chapters). */
export const readingEvents = pgTable(
  "reading_events",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    workId: text("work_id").notNull(), // opaque catalog/manga id
    chapterId: text("chapter_id").notNull(),
    readAt: timestamp("read_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("reading_event_uniq").on(t.userId, t.chapterId)],
);

/* ───────────────────────────── Affiliates (recurring 20%) ─────────────────────────────
 * A user becomes an affiliate (unique code/link). First-touch attribution writes a
 * `referrals` row at signup; each authorized monthly subscription of a referred user
 * accrues an `affiliateCommissions` row (one per affiliate+referred+period).
 */
export const affiliates = pgTable("affiliates", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  ratePct: integer("rate_pct").notNull().default(20),
  pixKey: text("pix_key"), // for manual payouts
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  affiliateId: integer("affiliate_id")
    .notNull()
    .references(() => affiliates.id, { onDelete: "cascade" }),
  referredUserId: text("referred_user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const affiliateCommissions = pgTable(
  "affiliate_commissions",
  {
    id: serial("id").primaryKey(),
    affiliateId: integer("affiliate_id")
      .notNull()
      .references(() => affiliates.id, { onDelete: "cascade" }),
    referredUserId: text("referred_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    period: text("period").notNull(), // YYYY-MM
    status: text("status").notNull().default("pending"), // pending | paid
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("commission_uniq").on(t.affiliateId, t.referredUserId, t.period)],
);
