"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/admin/require-permission";
import {
  normalizeRedirectPath,
  upsertUrlRedirect,
} from "@/lib/seo/redirects";

export type UrlRedirectRow = {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
  is_active: boolean;
  note: string | null;
  source: string;
  hit_count: number;
  last_hit_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function adminListRedirectsAction(limit = 200) {
  const gate = await requirePermission("admin.content");
  if (!gate.ok) return { ok: false as const, error: gate.error, items: [] as UrlRedirectRow[] };
  try {
    const { data, error } = await gate.supabase
      .from("url_redirects")
      .select(
        "id, from_path, to_path, status_code, is_active, note, source, hit_count, last_hit_at, created_at, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(Math.min(500, Math.max(1, Number(limit) || 200)));
    if (error) throw error;
    return { ok: true as const, items: (data ?? []) as UrlRedirectRow[] };
  } catch (e) {
    console.error("[adminListRedirects]", e);
    return { ok: false as const, error: "server" as const, items: [] as UrlRedirectRow[] };
  }
}

export async function adminUpsertRedirectAction(input: {
  fromPath: string;
  toPath: string;
  statusCode?: 301 | 302 | 307 | 308;
  note?: string;
  isActive?: boolean;
}) {
  const gate = await requirePermission("admin.content");
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const from_path = normalizeRedirectPath(input.fromPath);
  const to_path = normalizeRedirectPath(input.toPath);
  if (!from_path || !to_path)
    return { ok: false as const, error: "path_invalid" as const };
  if (from_path === to_path)
    return { ok: false as const, error: "same_path" as const };

  const res = await upsertUrlRedirect({
    fromPath: from_path,
    toPath: to_path,
    statusCode: input.statusCode ?? 301,
    source: "manual",
    note: input.note?.trim() || null,
    isActive: input.isActive !== false,
  });
  if (!res.ok) return { ok: false as const, error: "server" as const };
  revalidatePath("/admin/seo/redirects");
  return { ok: true as const };
}

export async function adminToggleRedirectAction(id: string, isActive: boolean) {
  const gate = await requirePermission("admin.content");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  try {
    const { error } = await gate.supabase
      .from("url_redirects")
      .update({ is_active: !!isActive, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/seo/redirects");
    return { ok: true as const };
  } catch (e) {
    console.error("[adminToggleRedirect]", e);
    return { ok: false as const, error: "server" as const };
  }
}

export async function adminDeleteRedirectAction(id: string) {
  const gate = await requirePermission("admin.content");
  if (!gate.ok) return { ok: false as const, error: gate.error };
  try {
    const { error } = await gate.supabase.from("url_redirects").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/seo/redirects");
    return { ok: true as const };
  } catch (e) {
    console.error("[adminDeleteRedirect]", e);
    return { ok: false as const, error: "server" as const };
  }
}