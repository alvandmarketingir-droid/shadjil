"use server";

import { requirePermission } from "@/lib/admin/require-permission";

export type AdminLogRow = {
  id: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  meta: string | null;
  created_at: string;
  actor_id: string | null;
};

export async function adminListLogsAction(limit = 100) {
  const gate = await requirePermission("admin.settings");
  if (!gate.ok) return { ok: false as const, error: gate.error, items: [] as AdminLogRow[] };
  try {
    const { data, error } = await gate.supabase
      .from("admin_logs")
      .select("id, action, entity, entity_id, meta, created_at, actor_id")
      .order("created_at", { ascending: false })
      .limit(Math.min(200, Math.max(1, limit)));
    if (error) {
      // جدول ممکن است هنوز نباشد
      console.error("[adminListLogs]", error.message);
      return { ok: true as const, items: [] as AdminLogRow[], tableMissing: true as const };
    }
    return { ok: true as const, items: (data as AdminLogRow[]) ?? [], tableMissing: false as const };
  } catch (e) {
    console.error("[adminListLogs]", e);
    return { ok: false as const, error: "server", items: [] as AdminLogRow[] };
  }
}

export async function adminWriteLogAction(input: {
  action: string;
  entity?: string;
  entity_id?: string;
  meta?: string;
}) {
  const gate = await requirePermission("admin.settings");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  try {
    const { error } = await gate.supabase.from("admin_logs").insert({
      action: input.action,
      entity: input.entity ?? null,
      entity_id: input.entity_id ?? null,
      meta: input.meta ?? null,
      actor_id: gate.userId ?? null,
    });
    if (error) throw error;
    return { ok: true as const };
  } catch (e) {
    console.error("[adminWriteLog]", e);
    return { ok: false as const, error: "server" };
  }
}
