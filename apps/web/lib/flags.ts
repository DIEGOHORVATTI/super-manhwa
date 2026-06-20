/**
 * Simple build-time feature flags (client-safe constants).
 *
 * `donationsEnabled` is off for now | it hides the donation page and every
 * donate button/link across the site. Flip to `true` to bring it back.
 */
export const donationsEnabled = false;

/** "Continuar com o Google" is hidden for now (email/password only). */
export const googleAuthEnabled = false;
