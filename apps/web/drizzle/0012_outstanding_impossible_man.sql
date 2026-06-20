ALTER TABLE "teams" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "avatar_r2_key" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "banner_r2_key" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_slug_unique" UNIQUE("slug");