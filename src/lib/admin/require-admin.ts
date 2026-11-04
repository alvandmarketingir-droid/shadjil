import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * در یک request فقط یک‌بار اجرا می‌شود (layout + page هر دو صدا بزنند → یک round-trip)
 */
export const requireAdmin = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "login_required" as const };
  }

  let admin;
  try {
    admin = createServiceClient();
  } catch (e) {
    console.error("[requireAdmin service]", e);
    return { ok: false as const, error: "server" as const };
  }

  const { data: profile, error } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[requireAdmin profile]", error);
    return { ok: false as const, error: "server" as const };
  }
  const role = String((profile as { role?: string } | null)?.role || "").toLowerCase();
  if (role !== "admin") {
    return { ok: false as const, error: "forbidden" as const };
  }

  return {
    ok: true as const,
    userId: user.id,
    supabase: admin,
  };
});
