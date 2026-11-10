"use server";

import { requirePermission } from "@/lib/admin/require-permission";
import { requireAdmin } from "@/lib/admin/require-admin";

function cleanIds(ids: string[]): string[] {
  return Array.from(new Set((ids || []).map((x) => String(x || "").trim()).filter(Boolean)));
}

/* ───────── Products ───────── */

/** Archive = soft delete (deleted_at + status archived) */
export async function adminArchiveProductsAction(ids: string[]) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase
      .from("products")
      .update({ deleted_at: new Date().toISOString(), status: "archived" })
      .in("id", list)
      .is("deleted_at", null);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminArchiveProducts]", e);
    return { ok: false as const, error: "server" as const };
  }
}

/** Permanent delete — حتی اگر در سفارش باشد (لینک order_items قطع می‌شود) */
export async function adminHardDeleteProductsAction(ids: string[]) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { data: variants } = await gate.supabase
      .from("product_variants")
      .select("id")
      .in("product_id", list);
    const variantIds = (variants ?? []).map((v: { id: string }) => v.id);

    // حذف لینک از سفارش‌ها (FK اجباری است؛ null ممکن نیست)
    if (variantIds.length) {
      await gate.supabase.from("order_items").delete().in("variant_id", variantIds);
      await gate.supabase.from("cart_items").delete().in("variant_id", variantIds);
    }
    await gate.supabase.from("order_items").delete().in("product_id", list);

    // تصاویر را حذف نکن — فقط وابستگی به محصول را قطع کن (کتابخانه رسانه بماند)
    await gate.supabase
      .from("product_images")
      .update({ product_id: null, variant_id: null })
      .in("product_id", list);

    for (const table of [
      "product_tag_map",
      "product_attribute_values",
      "stock_alerts",
      "wishlists",
      "cart_items",
      "reviews",
      "product_variants",
    ]) {
      await gate.supabase.from(table).delete().in("product_id", list);
    }
    const { error } = await gate.supabase.from("products").delete().in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminHardDeleteProducts]", e);
    return { ok: false as const, error: "server" as const };
  }
}

/* ───────── Categories ───────── */

export async function adminArchiveCategoriesAction(ids: string[]) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase
      .from("categories")
      .update({ is_active: false })
      .in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminArchiveCategories]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminHardDeleteCategoriesAction(ids: string[]) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { data: linked, error: linkErr } = await gate.supabase
      .from("products")
      .select("id, deleted_at, status")
      .in("category_id", list);
    if (linkErr) {
      console.error("[adminHardDeleteCategories] link", linkErr);
      return { ok: false as const, error: "server" as const, detail: linkErr.message };
    }
    const rows = linked ?? [];
    const live = rows.filter((r: { deleted_at?: string | null; status?: string | null }) => {
      if (r.deleted_at) return false;
      if (r.status && ["archived", "deleted", "trash"].includes(String(r.status))) return false;
      return true;
    });
    if (live.length > 0) {
      return { ok: false as const, error: "has_products" as const, detail: `live=${live.length}` };
    }

    // محصولات آرشیو را کامل حذف کن (FK + NOT NULL)
    const softIds = rows.map((r: { id: string }) => r.id);
    if (softIds.length > 0) {
      await gate.supabase.from("order_items").delete().in(
        "variant_id",
        (
          await gate.supabase
            .from("product_variants")
            .select("id")
            .in("product_id", softIds)
        ).data?.map((v: { id: string }) => v.id) ?? []
      );
      await gate.supabase.from("cart_items").delete().in(
        "variant_id",
        (
          await gate.supabase
            .from("product_variants")
            .select("id")
            .in("product_id", softIds)
        ).data?.map((v: { id: string }) => v.id) ?? []
      );
      await gate.supabase.from("wishlists").delete().in("product_id", softIds);
      await gate.supabase.from("stock_alerts").delete().in("product_id", softIds);
      await gate.supabase.from("reviews").delete().in("product_id", softIds);
      // تصاویر را حذف نکن — فقط unlink
      await gate.supabase
        .from("product_images")
        .update({ product_id: null, variant_id: null })
        .in("product_id", softIds);
      await gate.supabase.from("product_attribute_values").delete().in("product_id", softIds);
      await gate.supabase.from("product_variants").delete().in("product_id", softIds);
      await gate.supabase.from("products").delete().in("id", softIds);
    }

    const { count: childCount } = await gate.supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .in("parent_id", list);
    if ((childCount ?? 0) > 0) {
      return { ok: false as const, error: "has_children" as const };
    }

    const { error } = await gate.supabase.from("categories").delete().in("id", list);
    if (error) {
      console.error("[adminHardDeleteCategories] delete", error);
      if (String(error.code) === "23503" || /foreign key/i.test(error.message ?? "")) {
        return { ok: false as const, error: "has_products" as const, detail: error.message };
      }
      return { ok: false as const, error: "server" as const, detail: error.message };
    }
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminHardDeleteCategories]", e);
    return { ok: false as const, error: "server" as const };
  }
}

/* ───────── Brands ───────── */

export async function adminArchiveBrandsAction(ids: string[]) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase
      .from("brands")
      .update({ is_active: false })
      .in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminArchiveBrands]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminHardDeleteBrandsAction(ids: string[]) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { data: linked, error: linkErr } = await gate.supabase
      .from("products")
      .select("id, deleted_at, status")
      .in("brand_id", list);
    if (linkErr) {
      return { ok: false as const, error: "server" as const, detail: linkErr.message };
    }
    const rows = linked ?? [];
    const isLive = (r: { deleted_at?: string | null; status?: string | null }) => {
      if (r.deleted_at) return false;
      if (r.status && ["archived", "deleted", "trash"].includes(String(r.status))) return false;
      return true;
    };
    const live = rows.filter(isLive);
    if (live.length > 0) {
      return { ok: false as const, error: "has_products" as const, detail: `live=${live.length}` };
    }
    if (rows.length > 0) {
      const { error: upErr } = await gate.supabase
        .from("products")
        .update({ brand_id: null })
        .in("brand_id", list);
      if (upErr) {
        return { ok: false as const, error: "server" as const, detail: upErr.message };
      }
    }
    const { error } = await gate.supabase.from("brands").delete().in("id", list);
    if (error) {
      if (String(error.code) === "23503" || /foreign key/i.test(error.message ?? "")) {
        return { ok: false as const, error: "has_products" as const, detail: error.message };
      }
      return { ok: false as const, error: "server" as const, detail: error.message };
    }
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminHardDeleteBrands]", e);
    return { ok: false as const, error: "server" as const };
  }
}

/* ───────── Product tags ───────── */

export async function adminArchiveProductTagsAction(ids: string[]) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase
      .from("product_tags")
      .update({ is_active: false })
      .in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminArchiveProductTags]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminHardDeleteProductTagsAction(ids: string[]) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    await gate.supabase.from("product_tag_map").delete().in("tag_id", list);
    const { error } = await gate.supabase.from("product_tags").delete().in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminHardDeleteProductTags]", e);
    return { ok: false as const, error: "server" as const };
  }
}

/* ───────── Blog posts ───────── */

export async function adminArchiveBlogPostsAction(ids: string[]) {
  const gate = await requirePermission("admin.content");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase
      .from("blog_posts")
      .update({ status: "archived" })
      .in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminArchiveBlogPosts]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminHardDeleteBlogPostsAction(ids: string[]) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    await gate.supabase.from("blog_tag_map").delete().in("post_id", list);
    const { error } = await gate.supabase.from("blog_posts").delete().in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminHardDeleteBlogPosts]", e);
    return { ok: false as const, error: "server" as const };
  }
}

/* ───────── Blog categories ───────── */

export async function adminArchiveBlogCategoriesAction(ids: string[]) {
  const gate = await requirePermission("admin.content");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase
      .from("blog_categories")
      .update({ is_active: false })
      .in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminArchiveBlogCategories]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminHardDeleteBlogCategoriesAction(ids: string[]) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    await gate.supabase.from("blog_posts").update({ category_id: null }).in("category_id", list);
    const { error } = await gate.supabase.from("blog_categories").delete().in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminHardDeleteBlogCategories]", e);
    return { ok: false as const, error: "server" as const };
  }
}

/* ───────── Blog tags ───────── */

export async function adminArchiveBlogTagsAction(ids: string[]) {
  const gate = await requirePermission("admin.content");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase
      .from("blog_tags")
      .update({ is_active: false })
      .in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminArchiveBlogTags]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminHardDeleteBlogTagsAction(ids: string[]) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    await gate.supabase.from("blog_tag_map").delete().in("tag_id", list);
    const { error } = await gate.supabase.from("blog_tags").delete().in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminHardDeleteBlogTags]", e);
    return { ok: false as const, error: "server" as const };
  }
}

/* ───────── Product attributes ───────── */

export async function adminArchiveAttributesAction(ids: string[]) {
  const gate = await requirePermission("admin.content");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase
      .from("attributes")
      .update({ is_filterable: false })
      .in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminArchiveAttributes]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminHardDeleteAttributesAction(ids: string[]) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    await gate.supabase.from("product_attribute_values").delete().in("attribute_id", list);
    await gate.supabase.from("attribute_options").delete().in("attribute_id", list);
    const { error } = await gate.supabase.from("attributes").delete().in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminHardDeleteAttributes]", e);
    return { ok: false as const, error: "server" as const };
  }
}


/* ── ops archive/hard-delete ── */

export async function adminArchiveDiscountsAction(ids: string[]) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase.from("discounts").update({ is_active: false }).in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminArchiveDiscounts]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminHardDeleteDiscountsAction(ids: string[]) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    try { await gate.supabase.from("discount_uses").delete().in("discount_id", list); } catch { /* ignore */ }
    try { await gate.supabase.from("discount_reservations").delete().in("discount_id", list); } catch { /* ignore */ }
    const { error } = await gate.supabase.from("discounts").delete().in("id", list);
    if (error) {
      if (String((error as { code?: string }).code) === "23503") {
      }
      throw error;
    }
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminHardDeleteDiscounts]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminArchiveUsersAction(ids: string[]) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids).filter((id) => id !== gate.userId);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase.from("profiles").update({ is_active: false }).in("id", list);
    if (error) {
      const { error: e2 } = await gate.supabase.from("profiles").update({ role: "customer" }).in("id", list).neq("role", "superadmin");
      if (e2) throw e2;
    }
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminArchiveUsers]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminHardDeleteUsersAction(ids: string[]) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids).filter((id) => id !== gate.userId);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { count: _count, error: cErr } = await gate.supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("user_id", list);
    if (cErr) throw cErr;
    for (const table of ["addresses", "wishlists", "carts", "reviews", "stock_alerts", "tickets"] as const) {
      try { await gate.supabase.from(table).delete().in("user_id", list); } catch { /* ignore */ }
    }
    const { error } = await gate.supabase.from("profiles").delete().in("id", list);
    if (error) {
      if (String((error as { code?: string }).code) === "23503") {
      }
      throw error;
    }
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminHardDeleteUsers]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminArchiveMediaAction(ids: string[]) {
  // product_images has no is_active — archive = hard delete for library
  return adminHardDeleteMediaAction(ids);
}


export async function adminHardDeleteMediaAction(ids: string[]) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = (ids || []).map((x) => String(x).trim()).filter(Boolean);
  if (!list.length) return { ok: false as const, error: "empty" as const };

  try {
    const { data: rows, error: qErr } = await gate.supabase
      .from("product_images")
      .select("id, url")
      .in("id", list);
    if (qErr) {
      console.error("[adminHardDeleteMedia] select", qErr);
      return { ok: false as const, error: "server" as const };
    }

    try {
      const { adminDeleteProductImageAction } = await import(
        "@/app/admin/actions/media"
      );
      for (const row of rows ?? []) {
        await adminDeleteProductImageAction({
          url: row.url as string,
          imageId: row.id as string,
        });
      }
    } catch (e) {
      console.warn("[adminHardDeleteMedia] r2 helper", e);
      const { error } = await gate.supabase
        .from("product_images")
        .delete()
        .in("id", list);
      if (error) {
        console.error("[adminHardDeleteMedia] db", error);
        return { ok: false as const, error: "server" as const };
      }
    }

    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminHardDeleteMedia]", e);
    return { ok: false as const, error: "server" as const };
  }
}


export async function adminArchiveReviewsAction(ids: string[]) {
  const gate = await requirePermission("admin.reviews");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase.from("reviews").update({ status: "hidden" }).in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminArchiveReviews]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminHardDeleteReviewsAction(ids: string[]) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase.from("reviews").delete().in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminHardDeleteReviews]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminArchiveTicketsAction(ids: string[]) {
  const gate = await requirePermission("admin.content");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase.from("support_tickets").update({ status: "closed" }).in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminArchiveTickets]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminHardDeleteTicketsAction(ids: string[]) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    try { await gate.supabase.from("support_ticket_messages").delete().in("ticket_id", list); } catch { /* ignore */ }
    const { error } = await gate.supabase.from("support_tickets").delete().in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminHardDeleteTickets]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminArchiveNotificationsAction(ids: string[]) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase.from("notifications").update({ is_read: true }).in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminArchiveNotifications]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminHardDeleteNotificationsAction(ids: string[]) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase.from("notifications").delete().in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminHardDeleteNotifications]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminArchiveReturnsAction(ids: string[]) {
  const gate = await requirePermission("admin.returns");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase.from("return_requests").update({ status: "cancelled" }).in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminArchiveReturns]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminHardDeleteReturnsAction(ids: string[]) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    try { await gate.supabase.from("return_items").delete().in("return_request_id", list); } catch { /* ignore */ }
    const { error } = await gate.supabase.from("return_requests").delete().in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminHardDeleteReturns]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminArchiveStockAlertsAction(ids: string[]) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase.from("stock_alerts").update({ is_active: false }).in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminArchiveStockAlerts]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminHardDeleteStockAlertsAction(ids: string[]) {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase.from("stock_alerts").delete().in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminHardDeleteStockAlerts]", e);
    return { ok: false as const, error: "server" as const };
  }
}

/* ───────── Restore (بازگردانی از بایگانی) ───────── */

export async function adminRestoreCategoriesAction(ids: string[]) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase.from("categories").update({ is_active: true }).in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminRestoreCategories]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminRestoreBrandsAction(ids: string[]) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase.from("brands").update({ is_active: true }).in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminRestoreBrands]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminRestoreProductTagsAction(ids: string[]) {
  const gate = await requirePermission("admin.products");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase.from("product_tags").update({ is_active: true }).in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminRestoreProductTags]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminRestoreBlogPostsAction(ids: string[]) {
  const gate = await requirePermission("admin.content");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase.from("blog_posts").update({ status: "draft" }).in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminRestoreBlogPosts]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminRestoreBlogCategoriesAction(ids: string[]) {
  const gate = await requirePermission("admin.content");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase.from("blog_categories").update({ is_active: true }).in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminRestoreBlogCategories]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminRestoreBlogTagsAction(ids: string[]) {
  const gate = await requirePermission("admin.content");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  const list = cleanIds(ids);
  if (!list.length) return { ok: false as const, error: "empty" as const };
  try {
    const { error } = await gate.supabase.from("blog_tags").update({ is_active: true }).in("id", list);
    if (error) throw error;
    return { ok: true as const, count: list.length };
  } catch (e) {
    console.error("[adminRestoreBlogTags]", e);
    return { ok: false as const, error: "server" as const };
  }
}

