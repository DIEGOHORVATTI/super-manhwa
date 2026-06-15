import { ORPCError } from "@orpc/server";
import { contactInputSchema, dmcaInputSchema } from "@packages/contracts";

import { handleLegalSubmission, rateLimited } from "@/lib/legal";
import { base } from "../base";

/**
 * Legal forms (DMCA + contact). The service persists/notifies on its own and
 * degrades gracefully (returns `ok:false` only when neither DB nor e-mail is
 * configured → SERVICE_UNAVAILABLE so the UI falls back to plain mailto). Rides
 * on `base`; a tiny per-instance rate limit keyed off the caller IP.
 */
function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export const legalRouter = {
  contact: base.input(contactInputSchema).handler(async ({ input, context }) => {
    if (rateLimited(clientIp(context.headers))) {
      throw new ORPCError("TOO_MANY_REQUESTS", { message: "rate" });
    }
    // Honeypot | bots fill it, humans don't.
    if (input.hp) throw new ORPCError("BAD_REQUEST", { message: "invalid" });

    try {
      const res = await handleLegalSubmission("contact", input);
      if (!res.ok) throw new ORPCError("SERVICE_UNAVAILABLE", { message: "unconfigured" });
      return { ok: true };
    } catch (err) {
      if (err instanceof ORPCError) throw err;
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "error" });
    }
  }),

  dmca: base.input(dmcaInputSchema).handler(async ({ input, context }) => {
    if (rateLimited(clientIp(context.headers))) {
      throw new ORPCError("TOO_MANY_REQUESTS", { message: "rate" });
    }
    // Honeypot | bots fill it, humans don't.
    if (input.hp) throw new ORPCError("BAD_REQUEST", { message: "invalid" });

    try {
      const res = await handleLegalSubmission("dmca", input);
      if (!res.ok) throw new ORPCError("SERVICE_UNAVAILABLE", { message: "unconfigured" });
      return { ok: true };
    } catch (err) {
      if (err instanceof ORPCError) throw err;
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "error" });
    }
  }),
};
