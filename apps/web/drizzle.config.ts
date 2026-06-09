import { readFileSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit has no built-in .env loader and runs as a plain Node child, so it
 * doesn't always inherit the env the runtime loaded (e.g. Bun's auto-loaded
 * `.env.local`, which here is a symlink to the monorepo-root `.env`). Fall back
 * to reading `DATABASE_URL` straight from the root `.env` so `db:push`/`generate`
 * work regardless of how they're invoked. In prod/Vercel the env var is injected,
 * so `process.env` wins.
 */
function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const txt = readFileSync(new URL("../../.env", import.meta.url), "utf8");
    return txt.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim() ?? "";
  } catch {
    return "";
  }
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl() },
});
