import { requirePermission } from "@/lib/admin/require-permission";

/**
 * Full admin role only (not staff).
 * Prefer `requirePermission("admin.*")` for fine-grained staff access.
 */
export async function requireAdmin() {
  const gate = await requirePermission("admin.access");
  if (!gate.ok) return gate;
  if (gate.role !== "admin") {
    return { ok: false as const, error: "forbidden" as const };
  }
  return {
    ok: true as const,
    userId: gate.userId,
    role: gate.role,
    supabase: gate.supabase,
  };
}
