"use server";

import { requirePermission } from "@/lib/admin/require-permission";


type Role = "customer" | "admin" | "staff";


export async function adminListUsersAction(
  limit = 50,
  opts?: { q?: string; role?: string },
) {
  const gate = await requirePermission("admin.users");
  if (!gate.ok) return { ok: false as const, error: gate.error, items: [] };
  try {
    let query = gate.supabase
      .from("profiles")
      .select("id, full_name, phone, role, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(Math.min(200, Math.max(1, Number(limit) || 50)));

    const role = (opts?.role || "").trim();
    if (role && ["customer", "staff", "admin"].includes(role)) {
      query = query.eq("role", role as "customer" | "admin" | "staff");
    }
    const q = (opts?.q || "").trim().slice(0, 80);
    if (q) {
      const safe = q.replace(/[%_,]/g, " ").replace(/\s+/g, " ").trim();
      if (safe) {
        query = query.or(`full_name.ilike.%${safe}%,phone.ilike.%${safe}%`);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return { ok: true as const, items: data ?? [] };
  } catch (e) {
    console.error("[adminListUsers]", e);
    return { ok: false as const, error: "server", items: [] };
  }
}

export async function adminUpdateUserRoleAction(userId: string, role: Role) {
  const gate = await requirePermission("admin.users");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  if (!["customer", "admin", "staff"].includes(role)) {
    return { ok: false as const, error: "bad_role" };
  }
  // جلوگیری از حذف نقش خودت از admin (اختیاری ولی ایمن)
  if (userId === gate.userId && role !== "admin") {
    return { ok: false as const, error: "cannot_demote_self" };
  }
  try {
    const { error } = await gate.supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId);
    if (error) throw error;
    return { ok: true as const };
  } catch (e) {
    console.error("[adminUpdateUserRole]", e);
    return { ok: false as const, error: "server" };
  }
}
