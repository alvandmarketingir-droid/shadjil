"use server";

import { requirePermission } from "@/lib/admin/require-permission";
import { suggestAll, type SuggestInput } from "@/lib/seo/suggest";

export async function adminSeoSuggestAction(input: SuggestInput) {
  const gate = await requirePermission("admin.content");
  if (!gate.ok) return { ok: false as const, error: gate.error };

  const fallback = suggestAll(input);

  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return { ok: true as const, source: "template" as const, ...fallback };
  }

  try {
    const prompt = `تو متخصص SEO فارسی برای فروشگاه پوشاک مردانه هستی.
نام صفحه: ${input.pageName || "—"}
کلیدواژه‌ها: ${(input.focusKeyphrases || []).join("، ") || "—"}
توضیح کوتاه: ${(input.shortDescription || "").slice(0, 400)}
متن: ${(input.body || "").replace(/<[^>]+>/g, " ").slice(0, 800)}

فقط یک JSON خالص برگردان با کلیدهای:
metaTitle (حداکثر حدود ۵۵ کاراکتر فارسی)،
metaDescription (حداکثر حدود ۱۵۰ کاراکتر)،
ogTitle، ogDescription، twitterTitle، twitterDescription
عنوان و توضیح جذاب، شامل کلیدواژه، بدون اغراق دروغ.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_SEO_MODEL || "gpt-4o-mini",
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "فقط JSON معتبر برگردان." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      console.warn("[seo-ai]", res.status, await res.text().catch(() => ""));
      return { ok: true as const, source: "template" as const, ...fallback };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as Record<string, string>;

    return {
      ok: true as const,
      source: "openai" as const,
      metaTitle: String(parsed.metaTitle || fallback.metaTitle),
      metaDescription: String(parsed.metaDescription || fallback.metaDescription),
      ogTitle: String(parsed.ogTitle || fallback.ogTitle),
      ogDescription: String(parsed.ogDescription || fallback.ogDescription),
      twitterTitle: String(parsed.twitterTitle || fallback.twitterTitle),
      twitterDescription: String(parsed.twitterDescription || fallback.twitterDescription),
    };
  } catch (e) {
    console.warn("[seo-ai]", e);
    return { ok: true as const, source: "template" as const, ...fallback };
  }
}
