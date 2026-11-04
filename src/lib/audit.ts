import { createServiceClient } from "@/lib/supabase/service";

export type AuditAction =
  | "insert"
  | "update"
  | "delete"
  | "soft_delete"
  | "restore"
  | "status_change";

export async function writeAuditLog(input: {
  tableName: string;
  recordId?: string | null;
  action: AuditAction;
  oldData?: unknown;
  newData?: unknown;
  actorId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("audit_logs").insert({
      table_name: input.tableName,
      record_id: input.recordId ?? null,
      action: input.action,
      old_data: (input.oldData ?? null) as any,
      new_data: (input.newData ?? null) as any,
      actor_id: input.actorId ?? null,
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
    });
  } catch {
    // never break business flow if audit fails
  }
}
