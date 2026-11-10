"use server";

import { revalidatePath } from "next/cache";

import { randomUUID } from "crypto";
import { requirePermission } from "@/lib/admin/require-permission";
import {
  processProductImageSizes,
  type ProductImageSizeName,
} from "@/lib/process-product-image";
import { r2PutObject, r2DeleteObject } from "@/lib/r2";

const MAX_BYTES = 12 * 1024 * 1024; // 12MB

const SIZE_ORDER: ProductImageSizeName[] = [
  "thumb",
  "small",
  "medium",
  "large",
];

export async function adminUploadProductImageAction(formData: FormData) {
  const gate = await requirePermission("admin.media");
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "no_file" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false as const, error: "too_large" };
  }
  const mime = (file.type || "").toLowerCase();
  if (!mime.startsWith("image/")) {
    return { ok: false as const, error: "not_image" };
  }

  try {
    const input = Buffer.from(await file.arrayBuffer());
    const buffers = await processProductImageSizes(input);
    const id = randomUUID();
    const ts = Date.now();
    const urls: Partial<Record<ProductImageSizeName, string>> = {};
    const keys: Partial<Record<ProductImageSizeName, string>> = {};

    for (const weight of SIZE_ORDER) {
      const key = `products/${id}/${ts}-${weight}.webp`;
      const url = await r2PutObject({
        key,
        body: buffers[weight],
        contentType: "image/webp",
      });
      keys[weight] = key;
      urls[weight] = url;
    }

    // اگر productId در FormData باشد → مستقیم به گالری محصول؛ وگرنه کتابخانه رسانه
    const productIdRaw = formData.get("productId");
    const productId =
      typeof productIdRaw === "string" && productIdRaw.trim()
        ? productIdRaw.trim()
        : null;

    let sort_order = 0;
    if (productId) {
      const { data: maxRow } = await gate.supabase
        .from("product_images")
        .select("sort_order")
        .eq("product_id", productId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      sort_order = (maxRow?.sort_order ?? 0) + 1;
    }

    const { data: row, error: dbErr } = await gate.supabase
      .from("product_images")
      .insert({
        product_id: productId,
        url: urls.large!,
        alt_text: file.name?.slice(0, 120) || null,
        sort_order,
        is_primary: false,
        variant_id: null,
      })
      .select("id, url, alt_text, is_primary, sort_order, product_id")
      .maybeSingle();

    if (dbErr) {
      console.error("[adminUploadProductImage] db", dbErr);
      // فایل در R2 هست؛ UI را با url برمی‌گردانیم ولی لیست ممکن است خالی بماند
      return {
        ok: true as const,
        url: urls.large!,
        key: keys.large!,
        urls: urls as Record<ProductImageSizeName, string>,
        keys: keys as Record<ProductImageSizeName, string>,
        warning: "db_insert_failed" as const,
      };
    }

    if (productId) {
      try {
        const { data: p } = await gate.supabase
          .from("products")
          .select("slug")
          .eq("id", productId)
          .maybeSingle();
        if (p?.slug) revalidatePath(`/products/${p.slug}`);
        revalidatePath("/");
        revalidatePath("/products");
      } catch {}
    }
    return {
      ok: true as const,
      url: urls.large!,
      key: keys.large!,
      urls: urls as Record<ProductImageSizeName, string>,
      keys: keys as Record<ProductImageSizeName, string>,
      imageId: row?.id as string | undefined,
    };
  } catch (e) {
    console.error("[adminUploadProductImage]", e);
    return { ok: false as const, error: "upload_failed" };
  }
}

/**
 * حذف تصویر از R2 (همه سایزهای هم‌پایه) و در صورت دادن imageId از DB.
 * key می‌تواند large باشد؛ بقیه از همان پیشوند حذف می‌شوند.
 */
export async function adminDeleteProductImageAction(input: {
  key?: string | null;
  url?: string | null;
  imageId?: string | null;
}) {
  const gate = await requirePermission("admin.media");
  if (!gate.ok) return { ok: false as const, error: gate.error };

  try {
    let key = (input.key || "").trim();
    if (!key && input.url) {
      // استخراج key از URL عمومی
      try {
        const u = new URL(input.url);
        key = u.pathname.replace(/^\//, "");
      } catch {
        /* ignore */
      }
    }
    if (!key) {
      return { ok: false as const, error: "no_key" };
    }

    // products/{uuid}/{ts}-large.webp → پایه بدون -weight
    const m = key.match(/^(products\/[^/]+\/\d+)-(thumb|small|medium|large)\.webp$/);
    const base = m ? m[1] : key.replace(/-(thumb|small|medium|large)\.webp$/, "");

    for (const weight of SIZE_ORDER) {
      const k = `${base}-${weight}.webp`;
      try {
        await r2DeleteObject(k);
      } catch (e) {
        console.warn("[adminDeleteProductImage] r2", k, e);
      }
    }

    if (input.imageId) {
      const { error } = await gate.supabase
        .from("product_images")
        .delete()
        .eq("id", input.imageId);
      if (error) console.error("[adminDeleteProductImage] db", error);
    }

    return { ok: true as const };
  } catch (e) {
    console.error("[adminDeleteProductImage]", e);
    return { ok: false as const, error: "delete_failed" };
  }
}

export type MediaListItem = {
  id: string;
  url: string;
  alt_text: string | null;
  is_primary: boolean | null;
  sort_order: number | null;
  product_id: string | null;
  product_title: string | null;
};

export async function adminListProductImagesAction(limit = 60) {
  const gate = await requirePermission("admin.media");
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const { data, error } = await gate.supabase
    .from("product_images")
    .select(
      "id, url, alt_text, is_primary, sort_order, product_id, products(name)",
    )
    .order("created_at", { ascending: false })
    .order("sort_order", { ascending: true })
    .limit(Math.min(Math.max(limit, 1), 200));

  if (error) {
    console.error("[adminListProductImages]", error);
    return { ok: false as const, error: "list_failed" };
  }

  const raw: MediaListItem[] = (data ?? []).map((row: any) => ({
    id: row.id,
    url: row.url,
    alt_text: row.alt_text ?? null,
    is_primary: row.is_primary ?? null,
    sort_order: row.sort_order ?? null,
    product_id: row.product_id ?? null,
    product_title:
      row.products && typeof row.products === "object"
        ? (row.products.name as string) ?? null
        : null,
  }));
  // dedupe by url — یک ردیف در کتابخانه برای هر فایل
  const seen = new Set<string>();
  const items: MediaListItem[] = [];
  for (const it of raw) {
    const key = (it.url || "").split("?")[0];
    if (!key || seen.has(key)) continue;
    seen.add(key);
    items.push(it);
  }

  return { ok: true as const, items };
}

export async function adminUpdateProductImageMetaAction(input: {
  id: string;
  alt_text?: string | null;
  sort_order?: number;
}) {
  const gate = await requirePermission("admin.media");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const id = (input.id || "").trim();
  if (!id) return { ok: false as const, error: "bad_id" as const };
  const body: Record<string, unknown> = {};
  if (input.alt_text !== undefined) {
    const a = (input.alt_text ?? "").trim();
    body.alt_text = a.length ? a.slice(0, 200) : null;
  }
  if (input.sort_order !== undefined && Number.isFinite(input.sort_order)) {
    body.sort_order = Math.trunc(input.sort_order);
  }
  if (!Object.keys(body).length) return { ok: true as const };
  const { error } = await gate.supabase
    .from("product_images")
    .update(body as any)
    .eq("id", id);
  if (error) {
    console.error("[adminUpdateProductImageMeta]", error);
    return { ok: false as const, error: "update_failed" as const };
  }
  return { ok: true as const };
}


/** sanitize base filename: latin/digits/dash only */
function sanitizeImageBaseName(raw: string): string | null {
  const s = (raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  if (!s || s.length < 2 || s.length > 80) return null;
  return s.replace(/-(thumb|small|medium|large)$/i, "") || null;
}

function parseProductImageKey(url: string): {
  folder: string;
  base: string;
  weights: Array<"thumb" | "small" | "medium" | "large">;
} | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.replace(/^\//, "").split("/");
    if (parts.length < 3) return null;
    const file = parts[parts.length - 1] || "";
    const m = file.match(/^(.+)-(thumb|small|medium|large)\.webp$/i);
    if (!m) return null;
    return {
      folder: parts.slice(0, -1).join("/"),
      base: m[1],
      weights: ["thumb", "small", "medium", "large"],
    };
  } catch {
    return null;
  }
}

/** @deprecated URL فایل باید پایدار بماند — از alt_text استفاده کنید؛ rename فیزیکی توصیه نمی‌شود. */
export async function adminRenameProductImageAction(input: {
  id: string;
  newBaseName: string;
}) {
  const gate = await requirePermission("admin.media");
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const id = (input.id || "").trim();
  const newBase = sanitizeImageBaseName(input.newBaseName || "");
  if (!id) return { ok: false as const, error: "bad_id" as const };
  if (!newBase) return { ok: false as const, error: "bad_name" as const };

  const { data: row, error: qErr } = await gate.supabase
    .from("product_images")
    .select("id, url")
    .eq("id", id)
    .maybeSingle();
  if (qErr || !row?.url) {
    console.error("[adminRenameProductImage] select", qErr);
    return { ok: false as const, error: "not_found" as const };
  }

  const parsed = parseProductImageKey(String(row.url));
  if (!parsed) return { ok: false as const, error: "bad_url" as const };
  if (parsed.base === newBase) {
    return { ok: true as const, url: String(row.url), unchanged: true as const };
  }

  const { r2PutObject, r2DeleteObject, getPublicUrl } = await import("@/lib/r2");

  const oldKeys: string[] = [];
  let newLargeUrl = "";

  for (const weight of parsed.weights) {
    const oldKey = `${parsed.folder}/${parsed.base}-${weight}.webp`;
    const newKey = `${parsed.folder}/${newBase}-${weight}.webp`;
    oldKeys.push(oldKey);

    let buf: Buffer | null = null;
    try {
      const res = await fetch(getPublicUrl(oldKey));
      if (res.ok) buf = Buffer.from(await res.arrayBuffer());
    } catch (e) {
      console.warn("[rename] fetch old", oldKey, e);
    }

    if (!buf || buf.length === 0) {
      if (weight === "large") {
        return { ok: false as const, error: "source_missing" as const };
      }
      continue;
    }

    try {
      await r2PutObject({
        key: newKey,
        body: buf,
        contentType: "image/webp",
      });
    } catch (e) {
      console.error("[rename] put", newKey, e);
      return { ok: false as const, error: "upload_failed" as const };
    }

    if (weight === "large") newLargeUrl = getPublicUrl(newKey);
  }

  if (!newLargeUrl) {
    return { ok: false as const, error: "upload_failed" as const };
  }

  const { error: uErr } = await gate.supabase
    .from("product_images")
    .update({ url: newLargeUrl })
    .eq("id", id);
  if (uErr) {
    console.error("[adminRenameProductImage] db", uErr);
    return { ok: false as const, error: "db_failed" as const };
  }

  for (const k of oldKeys) {
    try {
      await r2DeleteObject(k);
    } catch (e) {
      console.warn("[rename] delete old", k, e);
    }
  }

  return { ok: true as const, url: newLargeUrl };
}


/** تصویر شاخص را روی یک URL/id تنظیم می‌کند و بقیه را non-primary می‌کند */
export async function adminSetPrimaryProductImageAction(input: {
  productId: string;
  url: string;
  imageId?: string | null;
}) {
  const gate = await requirePermission("admin.media");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const productId = (input.productId || "").trim();
  const url = (input.url || "").trim();
  if (!productId || !url) return { ok: false as const, error: "invalid" as const };

  // URLهای شاخص فعلی (قبل از تعویض) — بعداً حذف می‌شوند
  const { data: oldPrimaries } = await gate.supabase
    .from("product_images")
    .select("id, url")
    .eq("product_id", productId)
    .eq("is_primary", true)
    .is("variant_id", null);

  const oldPrimaryIds = new Set(
    (oldPrimaries ?? []).map((r: { id: string }) => r.id),
  );
  const oldPrimaryUrls = new Set(
    (oldPrimaries ?? []).map((r: { url: string }) => (r.url || "").split("?")[0]),
  );

  // همه غیرشاخص
  await gate.supabase
    .from("product_images")
    .update({ is_primary: false })
    .eq("product_id", productId)
    .is("variant_id", null);

  let primaryId: string | null = input.imageId?.trim() || null;

  if (primaryId) {
    const { error } = await gate.supabase
      .from("product_images")
      .update({
        url,
        is_primary: true,
        product_id: productId,
        variant_id: null,
        sort_order: 0,
      })
      .eq("id", primaryId);
    if (error) {
      console.error("[setPrimary by id]", error);
      return { ok: false as const, error: "update_failed" as const, detail: error.message };
    }
  } else {
    const { data: same } = await gate.supabase
      .from("product_images")
      .select("id")
      .eq("product_id", productId)
      .eq("url", url)
      .is("variant_id", null)
      .limit(1)
      .maybeSingle();

    if (same?.id) {
      primaryId = same.id as string;
      await gate.supabase
        .from("product_images")
        .update({ is_primary: true, sort_order: 0 })
        .eq("id", primaryId);
    } else {
      const { data: inserted, error } = await gate.supabase
        .from("product_images")
        .insert({
          product_id: productId,
          url,
          is_primary: true,
          sort_order: 0,
          variant_id: null,
        })
        .select("id")
        .maybeSingle();
      if (error) {
        console.error("[setPrimary insert]", error);
        return { ok: false as const, error: "insert_failed" as const, detail: error.message };
      }
      primaryId = (inserted?.id as string) ?? null;
    }
  }

  // حذف شاخص‌های قبلی از محصول — دیگر روی PDP دیده نشوند
  const toDelete: string[] = [];
  for (const r of oldPrimaries ?? []) {
    const id = (r as { id: string }).id;
    const u = ((r as { url: string }).url || "").split("?")[0];
    if (id === primaryId) continue;
    if (u === url.split("?")[0]) continue;
    toDelete.push(id);
  }
  // ردیف تکراری همان URL جدید
  const { data: dups } = await gate.supabase
    .from("product_images")
    .select("id")
    .eq("product_id", productId)
    .eq("url", url)
    .is("variant_id", null);
  for (const d of dups ?? []) {
    const id = (d as { id: string }).id;
    if (id !== primaryId) toDelete.push(id);
  }
  if (toDelete.length) {
    await gate.supabase.from("product_images").delete().in("id", [...new Set(toDelete)]);
  }

  try {
    const { data: p } = await gate.supabase
      .from("products")
      .select("slug")
      .eq("id", productId)
      .maybeSingle();
    if (p?.slug) {
      const { revalidatePath } = await import("next/cache");
      revalidatePath(`/products/${p.slug}`);
      revalidatePath("/");
      revalidatePath("/products");
    }
  } catch (e) {
    console.warn("[setPrimary revalidate]", e);
  }

  return { ok: true as const, imageId: primaryId };
}



/** گزارش/پاک‌سازی orphan — پیش‌فرض dryRun=true */
export async function adminRunOrphanMediaCleanupAction(input?: {
  dryRun?: boolean;
  minAgeHours?: number;
  maxDelete?: number;
}) {
  const gate = await requirePermission("admin.media");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  try {
    const { runOrphanMediaCleanup } = await import("@/lib/media/orphan-cleanup");
    const result = await runOrphanMediaCleanup({
      dryRun: input?.dryRun !== false,
      minAgeHours: input?.minAgeHours ?? 72,
      maxDelete: input?.maxDelete ?? 50,
    });
    return { ok: true as const, result };
  } catch (e) {
    console.error("[adminRunOrphanMediaCleanup]", e);
    return { ok: false as const, error: "server" as const };
  }
}
