"use server";

import { createClient } from "@/lib/supabase/server";
import { createNotificationForUser } from "@/lib/notifications/create";

export type NotificationDTO = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

async function uid() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function listMyNotificationsAction(limit = 50): Promise<{
  ok: boolean;
  items: NotificationDTO[];
  error?: string;
}> {
  const userId = await uid();
  if (!userId) return { ok: false, items: [], error: "auth" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, type, link, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { ok: false, items: [], error: error.message };
  return { ok: true, items: (data ?? []) as NotificationDTO[] };
}

export async function unreadNotificationsCountAction(): Promise<number> {
  const userId = await uid();
  if (!userId) return 0;
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

export async function markNotificationReadAction(id: string) {
  const userId = await uid();
  if (!userId) return { ok: false as const };
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  return { ok: !error };
}

export async function markAllNotificationsReadAction() {
  const userId = await uid();
  if (!userId) return { ok: false as const };
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  return { ok: !error };
}

/** تست: اعلان برای کاربر فعلی */
export async function createTestNotificationAction() {
  const userId = await uid();
  if (!userId) return { ok: false as const, error: "auth" };
  return createNotificationForUser({
    userId,
    title: "اعلان آزمایشی",
    body: "این یک اعلان تستی برای پنل مشتری است و در سوابق می‌ماند.",
    type: "system",
    link: "/dashboard?tab=notifications",
  });
}
