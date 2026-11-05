import type { NextRequest, NextResponse } from "next/server";
import { REQUEST_ID_HEADER } from "@/lib/request-id";
import { buildContentSecurityPolicy, createCspNonce } from "@/lib/security/csp";

export type SecurityHeaderOptions = {
  requestId?: string;
  /** Reuse a nonce already stamped on the request (`x-nonce`). */
  nonce?: string;
  /** Default true — set Content-Security-Policy with nonce + strict-dynamic. */
  withCsp?: boolean;
};

/**
 * Apply security headers. Returns the response and the CSP nonce used (if any).
 */
export function applySecurityHeaders(
  res: NextResponse,
  requestIdOrOpts?: string | SecurityHeaderOptions,
  maybeOpts?: SecurityHeaderOptions,
): NextResponse {
  const opts: SecurityHeaderOptions =
    typeof requestIdOrOpts === "string"
      ? { ...(maybeOpts || {}), requestId: requestIdOrOpts }
      : requestIdOrOpts || {};

  const requestId = opts.requestId;
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  );
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("X-DNS-Prefetch-Control", "on");
  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  if (requestId) res.headers.set(REQUEST_ID_HEADER, requestId);

  if (opts.withCsp !== false) {
    const nonce = opts.nonce || createCspNonce();
    res.headers.set("Content-Security-Policy", buildContentSecurityPolicy(nonce));
  }

  return res;
}

/** Continue the request with `x-nonce` so Next can stamp scripts. */
export function withNonceRequest(request: NextRequest, nonce: string): Headers {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  return requestHeaders;
}

export { createCspNonce };
