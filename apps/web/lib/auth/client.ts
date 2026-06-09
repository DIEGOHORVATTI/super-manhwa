"use client";
import { createAuthClient } from "better-auth/react";

/**
 * Browser-side Better Auth client. Same-origin (the [...all] route handler), so
 * no baseURL needed. Exposes hooks/methods used by the auth screens and header.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
