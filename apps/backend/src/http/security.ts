/**
 * Default response security headers. Production also gets HSTS. Lifted from
 * `novo-horizonte/server/src/http/security.ts`.
 */
export type SecurityHeadersOptions = { production?: boolean };

export const createDefaultSecurityHeaders = ({
  production = false,
}: SecurityHeadersOptions = {}): Record<string, string> => ({
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  ...(production ? { "strict-transport-security": "max-age=31536000; includeSubDomains" } : {}),
});
