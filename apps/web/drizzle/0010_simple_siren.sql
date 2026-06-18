CREATE TABLE "user_favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"work_id" text NOT NULL,
	"name" text NOT NULL,
	"image_url" text,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"work_id" text NOT NULL,
	"name" text NOT NULL,
	"image_url" text,
	"chapter_id" text NOT NULL,
	"chapter_name" text,
	"chapter_no" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_favorite_uniq" ON "user_favorites" USING btree ("user_id","work_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_progress_uniq" ON "user_progress" USING btree ("user_id","work_id");