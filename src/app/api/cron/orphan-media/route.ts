import { NextRequest, NextResponse } from "next/server";
import { runOrphanMediaCleanup } from "@/lib/media/orphan-cleanup";
import { assertCronBearer } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/orphan-media
 * Auth: Authorization: Bearer CRON_SECRET only
 *
 * Query:
 *   dryRun=1     فقط گزارش (پیشنهاد هفته اول)
 *   dryRun=0     حذف واقعی (سقف maxDelete)
 *   minAgeHours  پیش‌فرض 72
 *   maxDelete    پیش‌فرض 50
 */
export async function GET(req: NextRequest) {
  if (!assertCronBearer(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const dryParam = sp.get("dryRun") ?? sp.get("dry");
  // بدون پارامتر → dryRun امن (گزارش)
  const dryRun =
    dryParam === null || dryParam === undefined || dryParam === ""
      ? true
      : !(dryParam === "0" || dryParam === "false");

  const minAgeHours = Number(sp.get("minAgeHours") || "72");
  const maxDelete = Number(sp.get("maxDelete") || "50");

  const started = Date.now();
  try {
    const result = await runOrphanMediaCleanup({
      dryRun,
      minAgeHours: Number.isFinite(minAgeHours) ? minAgeHours : 72,
      maxDelete: Number.isFinite(maxDelete) ? maxDelete : 50,
      prefix: "products/",
    });
    return NextResponse.json({
      ...result,
      latencyMs: Date.now() - started,
    });
  } catch (e) {
    console.error("[cron/orphan-media]", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "server",
        latencyMs: Date.now() - started,
      },
      { status: 500 },
    );
  }
}
