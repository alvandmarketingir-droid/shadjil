"use server";
import { normalizeIranMobile, normalizePhone } from "@/lib/numbers";

import { requirePermission } from "@/lib/admin/require-permission";

import { PREDEFINED_NOTIFICATIONS } from "@/lib/notifications/templates";

export async function adminSendNotificationAction(input: {
  templateId?: string;
  mode: "user" | "all";
  /** شماره موبایل یا user id */
  target?: string;
  /** عنوان/متن دستی — اگر پر باشد جایگزین قالب می‌شود */
  customTitle?: string;
  customBody?: string;
}) {
  const gate = await requirePermission("admin.settings");
  if (!gate.ok) return gate;

  const customTitle = (input.customTitle || "").trim();
  const customBody = (input.customBody || "").trim();
  const useCustom = Boolean(customTitle && customBody);

  const tpl = input.templateId
    ? PREDEFINED_NOTIFICATIONS.find((x) => x.id === input.templateId)
    : undefined;
  if (!useCustom && !tpl) return { ok: false as const, error: "template" };

  const title = useCustom ? customTitle : (tpl!.title as string);
  const body = useCustom ? customBody : (tpl!.body as string);
  const type = useCustom ? "custom" : (tpl!.type as string);

  const service = gate.supabase;

  if (input.mode === "user") {
    const target = (input.target || "").trim();
    if (!target) return { ok: false as const, error: "target_required" };

    let userId = target;
    // اگر موبایل است از profiles پیدا کن
    if (!target.includes("-") || target.startsWith("09") || target.startsWith("+98")) {
      const phone = normalizeIranMobile(target) ?? normalizePhone(target).replace(/\s/g, "");
      const { data: prof } = await service
        .from("profiles")
        .select("id")
        .or(`phone.eq.${phone},phone.eq.${phone.replace(/^0/, "+98")}`)
        .limit(1)
        .maybeSingle();
      if (!prof?.id) {
        // fallback: raw id
        if (target.length < 30) {
          return { ok: false as const, error: "user_not_found" };
        }
      } else {
        userId = prof.id as string;
      }
    }

    const { error } = await service.from("notifications").insert({
      user_id: userId,
      title,
      body,
      type,
      link: "/dashboard?tab=notifications",
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, sent: 1 };
  }

  // همه کاربران دارای پروفایل
  const { data: users, error: listErr } = await service
    .from("profiles")
    .select("id")
    .limit(5000);
  if (listErr) return { ok: false as const, error: listErr.message };
  const rows = (users ?? []).map((u: { id: string }) => ({
    user_id: u.id,
    title,
    body,
    type,
    link: "/dashboard?tab=notifications",
  }));
  if (rows.length === 0) return { ok: true as const, sent: 0 };

  // batch
  const chunk = 200;
  let sent = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    const { error } = await service.from("notifications").insert(part);
    if (error) return { ok: false as const, error: error.message, sent };
    sent += part.length;
  }
  return { ok: true as const, sent };
}

export async function adminListRecentNotificationsAction(limit = 40) {
  const gate = await requirePermission("admin.settings");
  if (!gate.ok) return { ...gate, items: [] as any[] };
  const service = gate.supabase;
  const { data, error } = await service
    .from("notifications")
    .select("id, user_id, title, body, type, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return { ok: false as const, error: error.message, items: [] };
  return { ok: true as const, items: data ?? [] };
}
