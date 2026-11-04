import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { r2PutObject } from "@/lib/r2";
import { assertCronBearer } from "@/lib/security/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TABLES = [
  "categories", "brands", "attributes", "attribute_options", "tags",
  "blog_categories", "blog_tags", "products", "product_variants",
  "product_images", "product_attribute_values", "product_tags",
  "product_price_history", "discounts", "profiles", "orders",
  "order_items", "reviews", "return_requests", "blog_posts",
  "blog_tag_map", "site_settings", "contact_messages",
] as const;

const ROW_LIMIT = 10000;

export async function GET(req: NextRequest) {
  if (!assertCronBearer(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  try {
    const supabase = createServiceClient();
    const tables: Record<string, unknown[]> = {};
    const counts: Record<string, number> = {};
    const errors: Record<string, string> = {};

    for (const name of TABLES) {
      try {
        const { data, error } = await supabase.from(name).select("*").limit(ROW_LIMIT);
        if (error) {
          errors[name] = error.message;
          tables[name] = [];
          counts[name] = 0;
        } else {
          tables[name] = data ?? [];
          counts[name] = (data ?? []).length;
        }
      } catch (e) {
        errors[name] = e instanceof Error ? e.message : "error";
        tables[name] = [];
        counts[name] = 0;
      }
    }

    const payload = {
      ok: true as const,
      version: 1,
      exportedAt: new Date().toISOString(),
      rowLimit: ROW_LIMIT,
      counts,
      errors,
      tables,
    };

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const key = `backups/db/${stamp}.json`;
    const body = Buffer.from(JSON.stringify(payload), "utf-8");

    await r2PutObject({
      key,
      body,
      contentType: "application/json",
      cacheControl: "private, no-store",
    });

    await r2PutObject({
      key: "backups/db/latest.json",
      body: Buffer.from(
        JSON.stringify({
          key,
          exportedAt: payload.exportedAt,
          counts,
          errors,
          bytes: body.length,
        }),
        "utf-8",
      ),
      contentType: "application/json",
      cacheControl: "private, no-store",
    });

    return NextResponse.json({
      ok: true,
      key,
      counts,
      errors,
      bytes: body.length,
      latencyMs: Date.now() - started,
    });
  } catch (e) {
    console.error("[cron/backup]", e);
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
