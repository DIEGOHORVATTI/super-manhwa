CREATE TABLE "cached_novel_chapters" (
	"chapter_id" text PRIMARY KEY NOT NULL,
	"work_id" text,
	"title" text,
	"content_html" text NOT NULL,
	"refreshed_at" timestamp DEFAULT now() NOT NULL
);
