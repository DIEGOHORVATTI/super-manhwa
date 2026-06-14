CREATE TABLE "pixel_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_user_id" text,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"w" integer NOT NULL,
	"h" integer NOT NULL,
	"image_r2_key" text,
	"link_url" text,
	"title" text,
	"status" text DEFAULT 'reserved' NOT NULL,
	"payment_id" text,
	"reserved_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "pixel_blocks" ADD CONSTRAINT "pixel_blocks_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;