import { NextRequest, NextResponse } from "next/server";
import { isUpstashConfigured } from "@/lib/security/rate-limit";
import { REQUEST_ID_HEADER, resolveRequestId } from "@/lib/request-id";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request.headers.get(REQUEST_ID_HEADER));
  const log = logger.withRequestId(requestId);
  const started = Date.now();
  let supabase: "ok" | "error" | "skip" = "skip";

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      const res = await fetch(url + "/rest/v1/", {
        method: "HEAD",
        headers: { apikey: key, Authorization: "Bearer " + key },
        cache: "no-store",
      });
      supabase =
        res.ok || res.status === 404 || res.status === 200 ? "ok" : "error";
    }
  } catch (e) {
    supabase = "error";
    log.warn("health supabase check failed", {
      err: e instanceof Error ? e.message : "unknown",
    });
  }

  const upstash = isUpstashConfigured();
  const r2Configured = Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME,
  );
  const sentryConfigured = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
  const cronConfigured = Boolean(process.env.CRON_SECRET);

  const body = {
    ok: supabase !== "error",
    service: "shadjil",
    requestId,
    ts: new Date().toISOString(),
    latencyMs: Date.now() - started,
    region: process.env.VERCEL_REGION || "unknown",
    checks: {
      app: "ok",
      supabase,
      rateLimit: upstash ? "upstash" : "memory-fallback",
      r2: r2Configured ? "ok" : "missing-env",
      sentry: sentryConfigured ? "ok" : "missing-env",
      cronBackup: cronConfigured ? "ok" : "missing-env",
    },
  };

  if (!body.ok) log.error("health degraded", { checks: body.checks });

  return NextResponse.json(body, {
    status: body.ok ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
      [REQUEST_ID_HEADER]: requestId,
    },
  });
}
