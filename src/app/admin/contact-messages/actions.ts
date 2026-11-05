"use server";

import { requirePermission } from "@/lib/admin/require-permission";

export async function updateContactMessageStatus(id: string, status: string) {
  const gate = await requirePermission("admin.content");
  if (!gate.ok) return { error: gate.error };

  const allowed = new Set(["new", "read", "replied", "archived"]);
  if (!allowed.has(status)) return { error: "bad status" };
  const { error } = await gate.supabase
    .from("contact_messages")
    .update({ status })
    .eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}
