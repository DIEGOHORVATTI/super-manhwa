export * from "./schemas";

import * as routes from "./routes";

/**
 * Single source of truth for the wire. The backend `implement(contracts)`s this;
 * the frontend `createORPCClient<typeof contracts>()`s. There is no `sources`
 * route by design — the frontend is source-agnostic.
 *
 * @see https://orpc.dev/docs/quick-start
 */
export const contracts = routes;

export type AppRouter = typeof contracts;
