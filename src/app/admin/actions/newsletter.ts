"use server";

import { requirePermission } from "@/lib/admin/require-permission";

export type NewsletterRow = {
  id: string;
  phone: string;
  source: string | null;
  created_at: string;
  unsubscribed_at: string | null;
};

export async function adminListNewsletterAction(): Promise<{
  ok: boolean;
  items: NewsletterRow[];
  error?: string;
}> {
  const gate = await requirePermission("admin.content");
  if (!gate.ok) {
    return { ok: false, items: [], error: gate.error };
  }
  try {
    const { data, error } = await gate.supabase
      .from("newsletter_subscribers")
      .select("id, phone, source, created_at, unsubscribed_at")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) {
      console.error("[adminListNewsletter]", error);
      return { ok: false, items: [], error: "db" };
    }
    return {
      ok: true,
      items: (data ?? []) as NewsletterRow[],
    };
  } catch (e) {
    console.error("[adminListNewsletter]", e);
    return { ok: false, items: [], error: "server" };
  }
}

export async function adminUnsubscribeNewsletterAction(id: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const gate = await requirePermission("admin.content");
  if (!gate.ok) return { ok: false, error: gate.error };
  if (!id) return { ok: false, error: "validation" };
  try {
    const { error } = await gate.supabase
      .from("newsletter_subscribers")
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[adminUnsubscribeNewsletter]", error);
      return { ok: false, error: "db" };
    }
    return { ok: true };
  } catch (e) {
    console.error("[adminUnsubscribeNewsletter]", e);
    return { ok: false, error: "server" };
  }
}

export async function adminResubscribeNewsletterAction(id: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const gate = await requirePermission("admin.content");
  if (!gate.ok) return { ok: false, error: gate.error };
  if (!id) return { ok: false, error: "validation" };
  try {
    const { error } = await gate.supabase
      .from("newsletter_subscribers")
      .update({ unsubscribed_at: null })
      .eq("id", id);
    if (error) {
      console.error("[adminResubscribeNewsletter]", error);
      return { ok: false, error: "db" };
    }
    return { ok: true };
  } catch (e) {
    console.error("[adminResubscribeNewsletter]", e);
    return { ok: false, error: "server" };
  }
}
