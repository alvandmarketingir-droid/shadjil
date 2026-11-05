"use server";

import { requirePermission } from "@/lib/admin/require-permission";

export async function adminListReviewsAction(opts?: {
  approved?: "all" | "yes" | "no";
}) {
  const gate = await requirePermission("admin.reviews");
  if (!gate.ok) return { ok: false as const, error: gate.error, items: [] };
  try {
    let query = gate.supabase
      .from("reviews")
      .select(
        "id, rating, title, body, is_approved, admin_reply, created_at, product:products(name), user:profiles(full_name)",
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (opts?.approved === "yes") query = query.eq("is_approved", true);
    if (opts?.approved === "no") query = query.eq("is_approved", false);

    const { data, error } = await query;
    if (error) throw error;
    return { ok: true as const, items: data ?? [] };
  } catch (e) {
    console.error("[adminListReviews]", e);
    return { ok: false as const, error: "server", items: [] };
  }
}

export async function adminSetReviewApprovedAction(id: string, is_approved: boolean) {
  const gate = await requirePermission("admin.reviews");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  try {
    const { data: row, error: fetchErr } = await gate.supabase
      .from("reviews")
      .select("id, product_id")
      .eq("id", id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!row) return { ok: false as const, error: "not_found" };

    const { error } = await gate.supabase
      .from("reviews")
      .update({ is_approved })
      .eq("id", id);
    if (error) throw error;

    // DB trigger also runs; explicit RPC keeps stats correct if trigger lag/missing
    try {
      await gate.supabase.rpc("recompute_product_review_stats", {
        p_product_id: (row as { product_id: string }).product_id,
      });
    } catch (e) {
      console.error("[adminSetReviewApproved recompute]", e);
    }
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "server" };
  }
}

export async function adminSetReviewReplyAction(id: string, reply: string) {
  const gate = await requirePermission("admin.reviews");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  try {
    const text = (reply ?? "").trim();
    if (text.length > 2000) return { ok: false as const, error: "too_long" };
    const { error } = await gate.supabase
      .from("reviews")
      .update({ admin_reply: text || null, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return { ok: true as const };
  } catch (e) {
    console.error("[adminSetReviewReply]", e);
    return { ok: false as const, error: "server" };
  }
}
