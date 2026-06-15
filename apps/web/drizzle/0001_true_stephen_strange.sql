CREATE TABLE "achievements" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapter_texts" (
	"chapter_id" integer PRIMARY KEY NOT NULL,
	"language" text NOT NULL,
	"content" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapter_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"idx" integer NOT NULL,
	"sentence_idx" integer NOT NULL,
	"surface" text NOT NULL,
	"lemma" text,
	"reading" text,
	"is_word" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"new_words" integer DEFAULT 0 NOT NULL,
	"reviews" integer DEFAULT 0 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"card_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"rating" integer NOT NULL,
	"stability" integer NOT NULL,
	"difficulty" integer NOT NULL,
	"reviewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sentences" (
	"id" serial PRIMARY KEY NOT NULL,
	"chapter_id" integer NOT NULL,
	"idx" integer NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "srs_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_word_id" integer,
	"type" text DEFAULT 'cloze' NOT NULL,
	"sentence_id" integer,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text DEFAULT 'mercadopago' NOT NULL,
	"provider_sub_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"current_period_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"achievement_key" text NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_words" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"word_id" integer NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"stability" integer DEFAULT 0 NOT NULL,
	"difficulty" integer DEFAULT 0 NOT NULL,
	"due" timestamp,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"last_reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "words" (
	"id" serial PRIMARY KEY NOT NULL,
	"language" text NOT NULL,
	"lemma" text NOT NULL,
	"reading" text,
	"frequency" integer,
	"definition" text
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "xp" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "streak_days" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_study_date" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "daily_goal" integer DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "plan" text DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "premium_until" timestamp;--> statement-breakpoint
ALTER TABLE "user_works" ADD COLUMN "kind" text DEFAULT 'manga' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_works" ADD COLUMN "language" text;--> statement-breakpoint
ALTER TABLE "chapter_texts" ADD CONSTRAINT "chapter_texts_chapter_id_user_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."user_chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_tokens" ADD CONSTRAINT "chapter_tokens_chapter_id_user_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."user_chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_activity" ADD CONSTRAINT "daily_activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_card_id_srs_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."srs_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_logs" ADD CONSTRAINT "review_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sentences" ADD CONSTRAINT "sentences_chapter_id_user_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."user_chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "srs_cards" ADD CONSTRAINT "srs_cards_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "srs_cards" ADD CONSTRAINT "srs_cards_user_word_id_user_words_id_fk" FOREIGN KEY ("user_word_id") REFERENCES "public"."user_words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "srs_cards" ADD CONSTRAINT "srs_cards_sentence_id_sentences_id_fk" FOREIGN KEY ("sentence_id") REFERENCES "public"."sentences"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_key_achievements_key_fk" FOREIGN KEY ("achievement_key") REFERENCES "public"."achievements"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_words" ADD CONSTRAINT "user_words_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_words" ADD CONSTRAINT "user_words_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chapter_tokens_chapter_idx" ON "chapter_tokens" USING btree ("chapter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_activity_uniq" ON "daily_activity" USING btree ("user_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "sentence_chapter_idx_uniq" ON "sentences" USING btree ("chapter_id","idx");--> statement-breakpoint
CREATE INDEX "srs_cards_user_idx" ON "srs_cards" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_achievement_uniq" ON "user_achievements" USING btree ("user_id","achievement_key");--> statement-breakpoint
CREATE UNIQUE INDEX "user_word_uniq" ON "user_words" USING btree ("user_id","word_id");--> statement-breakpoint
CREATE UNIQUE INDEX "word_lang_lemma_uniq" ON "words" USING btree ("language","lemma");