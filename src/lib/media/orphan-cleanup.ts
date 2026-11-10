import { createServiceClient } from "@/lib/supabase/service";
import { r2DeleteObject, r2ListObjectKeys } from "@/lib/r2";

const SIZES = ["thumb", "small", "medium", "large"] as const;

/** پیش‌فرض‌های استاندارد سایت‌های بزرگ */
export const ORPHAN_DEFAULTS = {
  /** تا این سن (ساعت) حتی بدون ارجاع DB حذف نشود */
  minAgeHours: 72,
  /** سقف حذف در هر اجرا */
  maxDelete: 50,
  /** فقط رسانه محصول */
  prefix: "products/",
} as const;

export function keyFromPublicUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const key = u.pathname.replace(/^\//, "");
    return key || null;
  } catch {
    return null;
  }
}

/** همه سایزهای هم‌پایه یک تصویر محصول */
export function expandProductImageKeys(keyOrUrl: string): string[] {
  let key = keyOrUrl;
  if (key.startsWith("http")) {
    const k = keyFromPublicUrl(key);
    if (!k) return [];
    key = k;
  }
  const m = key.match(
    /^(products\/[^/]+\/\d+)-(thumb|small|medium|large)\.webp$/i,
  );
  if (m) {
    return SIZES.map((s) => `${m[1]}-${s}.webp`);
  }
  const bare = key.replace(/-(thumb|small|medium|large)\.webp$/i, "");
  if (bare.startsWith("products/")) {
    return SIZES.map((s) => `${bare}-${s}.webp`);
  }
  return key ? [key] : [];
}

export type OrphanCleanupResult = {
  ok: boolean;
  dryRun: boolean;
  listed: number;
  referenced: number;
  orphanCandidates: number;
  deleted: number;
  skippedYoung: number;
  minAgeHours: number;
  maxDelete: number;
  errors: string[];
  sampleOrphans: string[];
};

/**
 * Garbage collection امن برای R2:
 * - فقط prefix محصولات
 * - backups دست‌نخورده
 * - grace period از timestamp داخل نام فایل
 * - dryRun پیش‌فرض true در لایه ادمین؛ cron می‌تواند dryRun=0 بدهد
 */
export async function runOrphanMediaCleanup(opts?: {
  dryRun?: boolean;
  minAgeHours?: number;
  maxDelete?: number;
  prefix?: string;
}): Promise<OrphanCleanupResult> {
  const dryRun = opts?.dryRun ?? true;
  const minAgeHours = opts?.minAgeHours ?? ORPHAN_DEFAULTS.minAgeHours;
  const maxDelete = Math.min(
    Math.max(opts?.maxDelete ?? ORPHAN_DEFAULTS.maxDelete, 1),
    200,
  );
  const prefix = opts?.prefix ?? ORPHAN_DEFAULTS.prefix;

  const errors: string[] = [];
  const supabase = createServiceClient();

  const referenced = new Set<string>();
  let from = 0;
  const page = 1000;
  for (;;) {
    const { data, error } = await supabase
      .from("product_images")
      .select("url")
      .range(from, from + page - 1);
    if (error) {
      errors.push(`db:${error.message}`);
      break;
    }
    const rows = data ?? [];
    for (const row of rows) {
      const url = String((row as { url?: string }).url ?? "");
      for (const k of expandProductImageKeys(url)) {
        referenced.add(k);
      }
    }
    if (rows.length < page) break;
    from += page;
  }

  const allKeys = await r2ListObjectKeys({ prefix, maxKeys: 15000 });
  const now = Date.now();
  const minAgeMs = minAgeHours * 3600 * 1000;

  const orphans: string[] = [];
  let skippedYoung = 0;

  for (const key of allKeys) {
    if (!key.startsWith("products/")) continue;
    if (key.startsWith("backups/")) continue;
    if (referenced.has(key)) continue;

    const tm = key.match(/\/(\d{10,13})-(thumb|small|medium|large)\.webp$/i);
    if (tm) {
      let ts = Number(tm[1]);
      if (tm[1].length === 10) ts *= 1000;
      if (Number.isFinite(ts) && now - ts < minAgeMs) {
        skippedYoung += 1;
        continue;
      }
    } else {
      // بدون timestamp قابل‌اعتماد → حذف نکن (ایمن)
      skippedYoung += 1;
      continue;
    }
    orphans.push(key);
  }

  let deleted = 0;
  const sample = orphans.slice(0, 20);

  if (!dryRun) {
    for (const key of orphans.slice(0, maxDelete)) {
      try {
        await r2DeleteObject(key);
        deleted += 1;
      } catch (e) {
        errors.push(
          `del:${key}:${e instanceof Error ? e.message : "err"}`,
        );
      }
    }
  }

  return {
    ok: true,
    dryRun,
    listed: allKeys.length,
    referenced: referenced.size,
    orphanCandidates: orphans.length,
    deleted: dryRun ? 0 : deleted,
    skippedYoung,
    minAgeHours,
    maxDelete,
    errors: errors.slice(0, 20),
    sampleOrphans: sample,
  };
}
