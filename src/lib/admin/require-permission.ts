import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { can, normalizeRole, type Permission, type Role } from "@/lib/permissions";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PermissionGateOk = {
  ok: true;
  userId: string;
  role: Role;
  supabase: SupabaseClient;
};

export type PermissionGateErr = {
  ok: false;
  error: "login_required" | "forbidden" | "server";
};

export type PermissionGate = PermissionGateOk | PermissionGateErr;

export const getSessionRole = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "login_required" as const };

  let admin: SupabaseClient;
  try {
    admin = createServiceClient();
  } catch (e) {
    console.error("[getSessionRole service]", e);
    return { ok: false as const, error: "server" as const };
  }

  const { data: profile, error } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    console.error("[getSessionRole]", error);
    return { ok: false as const, error: "server" as const };
  }
  const role = normalizeRole((profile as { role?: string } | null)?.role);
  return { ok: true as const, userId: user.id, role, supabase: admin };
});

/** Fine-grained admin gate — staff + admin per ROLE_MAP. */
export async function requirePermission(
  permission: Permission,
): Promise<PermissionGate> {
  const session = await getSessionRole();
  if (!session.ok) return session;
  if (!can(session.role, permission)) {
    return { ok: false as const, error: "forbidden" as const };
  }
  return {
    ok: true as const,
    userId: session.userId,
    role: session.role,
    supabase: session.supabase,
  };
}
