"use server";

import { requirePermission } from "@/lib/admin/require-permission";
import { isUpstashConfigured } from "@/lib/security/rate-limit";

export async function adminHealthCheckAction() {
  const gate = await requirePermission("admin.settings");
  if (!gate.ok) {
    return { ok: false as const, error: gate.error, health: null };
  }

  const started = Date.now();
  let supabase: "ok" | "error" | "skip" = "skip";

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      const res = await fetch(`${url}/rest/v1/`, {
        method: "HEAD",
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
      });
      supabase =
        res.ok || res.status === 404 || res.status === 200 ? "ok" : "error";
    }
  } catch {
    supabase = "error";
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
  const smsConfigured = Boolean(process.env.MELIPAYAMAK_USERNAME?.trim());
  const indexAllowed =
    ["1", "true", "yes"].includes(
      (process.env.NEXT_PUBLIC_ALLOW_INDEX || "").trim().toLowerCase(),
    );

  return {
    ok: true as const,
    health: {
      healthy: supabase !== "error",
      latencyMs: Date.now() - started,
      region: process.env.VERCEL_REGION || "unknown",
      ts: new Date().toISOString(),
      checks: {
        app: "ok" as const,
        supabase,
        rateLimit: upstash ? "upstash" : "memory-fallback",
        r2: r2Configured ? "ok" : "missing-env",
        sentry: sentryConfigured ? "ok" : "missing-env",
        cronBackup: cronConfigured ? "ok" : "missing-env",
        sms: smsConfigured ? "configured" : "missing-env",
        searchIndex: indexAllowed ? "indexable" : "noindex",
      },
    },
  };
}
