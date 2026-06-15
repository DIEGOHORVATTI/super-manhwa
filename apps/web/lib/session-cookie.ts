/**
 * Anonymous session cookie | the only piece of per-visitor state the server
 * keeps. It carries no identity (a random id), exists solely to bind signed
 * chapter-page image URLs to the browser that requested them, and is set by
 * middleware. Shared here (no `server-only`) so middleware (edge) and the RSC
 * getter can both import the name without pulling in node APIs.
 */
export const SESSION_COOKIE = "mr_sid";

export const SESSION_MAX_AGE_S = 365 * 24 * 60 * 60; // 1 year
