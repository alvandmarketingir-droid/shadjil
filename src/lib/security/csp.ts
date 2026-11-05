import { randomBytes } from "crypto";

/** Per-request CSP nonce (base64). */
export function createCspNonce(): string {
  return randomBytes(16).toString("base64");
}

/**
 * CSP with nonce + strict-dynamic for scripts.
 * - `unsafe-inline` kept as fallback for older browsers (ignored when nonce is honored).
 * - `style-src` keeps unsafe-inline (Tailwind / CSS-in-JS); no visual change.
 * - `unsafe-eval` retained for Next runtime compatibility.
 */
export function buildContentSecurityPolicy(nonce: string): string {
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    "'unsafe-inline'",
    "'unsafe-eval'",
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://media.pirahanmardane.ir https://*.supabase.co https://*.r2.dev https://placehold.co",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://rest.payamak-panel.com",
    "media-src 'self' https://media.pirahanmardane.ir",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}
