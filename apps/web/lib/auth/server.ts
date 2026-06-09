import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { dbEnabled, getDb, schema } from "../db";
import { emailEnabled, sendEmail } from "../email";

/**
 * Better Auth instance — email/password (with verification + reset), Google
 * social login, and the account-linking primitives used to attach multiple
 * AniList identities to one user. Lives in the Next app (which owns the
 * Postgres). Gated on `DATABASE_URL`: when unset, `auth` is null and the route
 * handler 503s, mirroring the graceful-degradation pattern used elsewhere.
 *
 * Table/column names in `schema.ts` already match Better Auth's core model, so
 * the Drizzle adapter needs no field mapping — only the extra `user` columns
 * (role/handle/bio/banned) are declared as additional fields.
 */
async function deliver(to: string, subject: string, html: string) {
  if (!emailEnabled) {
    // No Resend key in dev: log the action link so flows are still testable.
    console.warn(`[auth] e-mail disabled — ${subject} for ${to}`);
    return;
  }
  await sendEmail({ to, subject, html });
}

function build() {
  const db = getDb();
  return betterAuth({
    appName: "Super Manhwa",
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      async sendResetPassword({ user, url }) {
        await deliver(
          user.email,
          "Redefinir sua senha — Super Manhwa",
          `<p>Olá! Clique para redefinir sua senha:</p><p><a href="${url}">Redefinir senha</a></p>`,
        );
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      async sendVerificationEmail({ user, url }) {
        await deliver(
          user.email,
          "Confirme seu e-mail — Super Manhwa",
          `<p>Bem-vindo à Super Manhwa! Confirme seu e-mail:</p><p><a href="${url}">Confirmar e-mail</a></p>`,
        );
      },
    },
    socialProviders:
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            },
          }
        : undefined,
    account: {
      // Allow attaching several providers (incl. multiple AniList accounts) to
      // one logged-in user instead of erroring on a known e-mail.
      accountLinking: { enabled: true, trustedProviders: ["google", "anilist"] },
    },
    user: {
      additionalFields: {
        role: { type: "string", defaultValue: "user", input: false },
        handle: { type: "string", required: false },
        bio: { type: "string", required: false },
        banned: { type: "boolean", defaultValue: false, input: false },
        // Language-learning profile — surfaced in the session, server-managed.
        xp: { type: "number", defaultValue: 0, input: false },
        streakDays: { type: "number", defaultValue: 0, input: false },
        dailyGoal: { type: "number", defaultValue: 20, input: false },
        plan: { type: "string", defaultValue: "free", input: false },
        premiumUntil: { type: "date", required: false, input: false },
      },
    },
  });
}

export type AppAuth = ReturnType<typeof build>;

export const auth: AppAuth | null = dbEnabled ? build() : null;
