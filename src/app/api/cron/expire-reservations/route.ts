import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { assertCronBearer } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  if (!assertCronBearer(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("release_expired_stock_reservations");
    if (error) {
      console.error("[cron/expire-reservations]", error.message);
      return NextResponse.json(
        { ok: false, error: error.message, latencyMs: Date.now() - started },
        { status: 500 },
      );
    }
    return NextResponse.json({
      ok: true,
      released: Number(data ?? 0),
      latencyMs: Date.now() - started,
    });
  } catch (e) {
    console.error("[cron/expire-reservations]", e);
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
