ALTER TABLE "donations" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "hidden" boolean DEFAULT false NOT NULL;