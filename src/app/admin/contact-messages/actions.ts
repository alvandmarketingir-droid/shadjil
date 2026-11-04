"use server";

import { requireAdmin } from "@/lib/admin/require-admin";

export async function updateContactMessageStatus(id: string, status: string) {
  const gate = await requireAdmin();
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
