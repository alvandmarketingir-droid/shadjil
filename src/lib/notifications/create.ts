import { createServiceClient } from "@/lib/supabase/service";

/** داخلی — فقط از سرور/اکشن‌های احرازشده صدا زده شود؛ Server Action عمومی نیست. */
export async function createNotificationForUser(input: {
  userId: string;
  title: string;
  body?: string;
  type?: string;
  link?: string;
}) {
  const service = createServiceClient();
  const { data, error } = await service
    .from("notifications")
    .insert({
      user_id: input.userId,
      title: input.title,
      body: input.body ?? null,
      type: input.type ?? "system",
      link: input.link ?? null,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, id: data.id as string };
}
