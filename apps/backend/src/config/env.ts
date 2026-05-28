import { z } from "zod";
import packageJson from "../../package.json" with { type: "json" };

/**
 * Centralised environment loader. Every env variable the app reads MUST go
 * through `env` exported below — call sites don't touch `process.env` directly.
 * That gives us:
 *   - one place to see every input the app needs;
 *   - Zod-validated coercion (strings → numbers/booleans);
 *   - sensible dev defaults so `bun run dev` works out of the box.
 *
 * Pattern mirrored from `novo-horizonte/remarketing/apps/backend/src/config/env.ts`.
 */

const numberFromString = z.preprocess((v: unknown) => {
  if (typeof v !== "string") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}, z.number());

const boolFromString = z.preprocess((v: unknown) => {
  if (typeof v !== "string") return v;
  const value = v.trim().toLowerCase();
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return v;
}, z.boolean());

export const DEFAULT_ENV = {
  NODE_ENV: "development",
  PORT: 8787,
  VERSION: packageJson.version,
  CORS_ORIGIN: "*",
  /** AES-derived key seed; minted ids and image tokens are HMAC'd with it. */
  IMAGE_TOKEN_SECRET: "dev-only-secret-change-in-prod",
  /** Shared secret the frontend sends as `X-API-KEY` to access this backend. */
  API_KEY: "dev-api-key-change-in-prod",
  /** Host path for the persistent short-id store (Docker volume mount). */
  ID_STORE_PATH: "/app/data/ids.jsonl",
  /** FlareSolverr sidecar for Cloudflare-protected sources (used by the extension runtime). */
  FLARESOLVERR_URL: "http://flaresolverr:8191/v1",
  /** Whether the OpenAPI reference page is served. */
  EXPOSE_DOCS: true,
} as const;

export const EnvSchema = z
  .object({
    NODE_ENV: z.string().default(DEFAULT_ENV.NODE_ENV),
    PORT: numberFromString.default(DEFAULT_ENV.PORT),
    VERSION: z.string().default(DEFAULT_ENV.VERSION),
    CORS_ORIGIN: z.string().default(DEFAULT_ENV.CORS_ORIGIN),
    IMAGE_TOKEN_SECRET: z.string().default(DEFAULT_ENV.IMAGE_TOKEN_SECRET),
    API_KEY: z.string().default(DEFAULT_ENV.API_KEY),
    ID_STORE_PATH: z.string().default(DEFAULT_ENV.ID_STORE_PATH),
    FLARESOLVERR_URL: z.string().default(DEFAULT_ENV.FLARESOLVERR_URL),
    EXPOSE_DOCS: boolFromString.default(DEFAULT_ENV.EXPOSE_DOCS),
  })
  .passthrough();

export type Env = z.infer<typeof EnvSchema>;

export const env = EnvSchema.parse(process.env);

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
