import { ORPCError } from "@orpc/server";
import { env } from "@/lib/env";
import { subscribeInputSchema } from "@packages/contracts";

import { newsletterEnabled, subscribeEmail } from "@/lib/newsletter";
import { base } from "../base";

/**
 * Newsletter signup (double opt-in). Has its own gating (`newsletterEnabled` =
 * DB + e-mail configured), so it rides on `base` rather than `pub`. The
 * confirm/unsubscribe steps stay as native e-mail-link GET handlers.
 */
export const newsletterRouter = {
  subscribe: base.input(subscribeInputSchema).handler(async ({ input, context }) => {
    if (!newsletterEnabled()) {
      throw new ORPCError("SERVICE_UNAVAILABLE", { message: "unconfigured" });
    }
    // Honeypot | bots fill it, humans don't.
    if (input.hp) throw new ORPCError("BAD_REQUEST", { message: "invalid" });

    const proto = context.headers.get("x-forwarded-proto") ?? "https";
    const host = context.headers.get("host") ?? "localhost";
    const origin = `${proto}://${host}`;
    const result = await subscribeEmail(input.email, env.SITE_URL ?? origin);
    if (result === "error") throw new ORPCError("BAD_GATEWAY", { message: "send" });
    return { ok: true, status: result };
  }),
};
