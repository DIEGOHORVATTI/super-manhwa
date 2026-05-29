import "server-only";
import { createORPCClient } from "@orpc/client";
import type { ContractRouterClient } from "@orpc/contract";
import type { JsonifiedClient } from "@orpc/openapi-client";
import { OpenAPILink } from "@orpc/openapi-client/fetch";
import { contracts } from "@packages/contracts";

/**
 * Server-only oRPC client → the separate delivery backend (Docker container).
 * RSC calls this directly; the browser never sees DELIVERY_SERVICE_URL nor the
 * shared API_KEY (both are server-only env). For browser-side requests the
 * /api/[...path] route on Next forwards same-origin and injects the key there.
 */
const BACKEND = process.env.DELIVERY_SERVICE_URL ?? "http://localhost:8787";
const API_KEY = process.env.API_KEY ?? "dev-api-key-change-in-prod";

/**
 * Catalog data changes slowly (the backend itself caches 5 min–6 h), so we let
 * these RSC fetches sit in Next's Data Cache for 5 minutes. This is what makes
 * dropping `force-dynamic` worthwhile: pages still render dynamically (they read
 * searchParams / cookies), but the backend round-trips are deduped/cached
 * instead of firing on every request. Reader page-image URLs are signed
 * per-request *after* this fetch, so caching the page list is safe.
 */
const CATALOG_REVALIDATE_S = 300;

const link = new OpenAPILink(contracts, {
  url: `${BACKEND}/api`,
  headers: () => ({ "X-API-KEY": API_KEY }),
  fetch: (request, init) =>
    globalThis.fetch(request, { ...init, next: { revalidate: CATALOG_REVALIDATE_S } }),
});

export const api: JsonifiedClient<ContractRouterClient<typeof contracts>> = createORPCClient(link);
