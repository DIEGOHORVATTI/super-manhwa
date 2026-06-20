CREATE TABLE "tags" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"emoji" text,
	"color" text,
	"description" text,
	"assignable" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"tag_key" text NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_tag_key_tags_key_fk" FOREIGN KEY ("tag_key") REFERENCES "public"."tags"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_tag_uniq" ON "user_tags" USING btree ("user_id","tag_key");