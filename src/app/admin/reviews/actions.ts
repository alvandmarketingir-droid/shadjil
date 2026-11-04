"use server";

import { requireAdmin } from "@/lib/admin/require-admin";
import { revalidatePath } from "next/cache";

export async function updateReviewApproval(id: string, isApproved: boolean) {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };

  const supabase = gate.supabase;

  const { data: prev } = await supabase
    .from("reviews")
    .select("id, user_id, product_id, is_approved")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("reviews")
    .update({ is_approved: isApproved })
    .eq("id", id);

  if (error) return { error: error.message };

  // اعلان فقط وقتی از غیرتأیید → تأیید می‌رود
  if (
    isApproved &&
    prev &&
    !(prev as { is_approved?: boolean }).is_approved &&
    (prev as { user_id?: string }).user_id
  ) {
    try {
      await supabase.from("notifications").insert({
        user_id: (prev as { user_id: string }).user_id,
        title: "نظر شما تأیید شد",
        body: "نظر شما روی محصول منتشر شد. از بازخوردتان سپاسگزاریم.",
        type: "system",
        link: "/dashboard?tab=notifications",
      });
    } catch (ne) {
      console.error("[updateReviewApproval notify]", ne);
    }
  }

  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateReviewReply(id: string, adminReply: string) {
  const gate = await requireAdmin();
  if (!gate.ok) return { error: gate.error };

  const { error } = await gate.supabase
    .from("reviews")
    .update({ admin_reply: adminReply.trim() || null })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/reviews");
  return { ok: true };
}
