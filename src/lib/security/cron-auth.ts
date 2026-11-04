import type { NextRequest } from "next/server";

/**
 * Cron auth: Authorization Bearer CRON_SECRET only.
 * Query ?secret= is rejected (secrets must not appear in URLs/logs).
 */
export function assertCronBearer(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}
