import { NextRequest, NextResponse } from "next/server";
import { processPendingJobs } from "@/lib/queue/jobs";
import { assertCronBearer } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!assertCronBearer(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await processPendingJobs(15);
    return NextResponse.json({ ok: true, ...result, ts: new Date().toISOString() });
  } catch (e) {
    console.error("[cron/jobs]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "server" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
