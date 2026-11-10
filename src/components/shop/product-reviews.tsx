"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createProductReviewAction,
  listProductReviewsAction,
} from "@/app/(shop)/actions/reviews";
import { ComposerInput } from "@/components/ui/composer-input";
import { formatJalaliDate } from "@/lib/dates/jalali";
import { useRtEvent } from "@/hooks/use-rt-event";
import { RT } from "@/lib/realtime/events";


type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  admin_reply?: string | null;
  is_verified?: boolean | null;
  created_at: string;
  user?: { full_name: string | null } | null;
};

export function ProductReviews({ productId }: { productId: string }) {
  const [items, setItems] = useState<Review[]>([]);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await listProductReviewsAction(productId);
    if (res.ok) setItems(res.items as Review[]);
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  useRtEvent(RT.reviews, () => {
    void load();
  });

  async function onSend(body: string) {
    setBusy(true);
    setMsg("");
    const res = await createProductReviewAction({
      productId,
      rating,
      title: title || undefined,
      body,
    });
    setBusy(false);
    if (!res.ok) {
      const map: Record<string, string> = {
        login_required: "برای ثبت نظر وارد شوید",
        rating_invalid: "امتیاز نامعتبر",
        body_short: "متن نظر کوتاه است",
        already_reviewed: "قبلاً برای این محصول نظر داده‌اید",
        not_purchased: "فقط پس از خرید این محصول می‌توانید نظر دهید",
      };
      setMsg(map[res.error] || res.error || "خطا در ثبت نظر");
      return;
    }
    setTitle("");
    setMsg("نظر شما ثبت شد و پس از تأیید نمایش داده می‌شود.");
    void load();
  }

  return (
    <section className="space-y-6 border-t pt-8" dir="rtl">
      <h2 className="text-xl font-bold text-primary">نظرات خریداران</h2>

      <div className="space-y-3">
        {items.map((r) => (
          <article key={r.id} className="border-border rounded-xl border p-4 text-sm">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {r.user?.full_name?.trim() || "خریدار"}
              </span>
              {r.is_verified ? (
                <span
                  title="این نظر پس از خرید ثبت شده" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-md px-1.5 py-0.5 text-[10px] font-medium">
                  خریدار
                </span>
              ) : null}
              <span className="text-amber-600">{"★".repeat(r.rating)}</span>
              <time className="text-muted-foreground text-xs">
                {formatJalaliDate(r.created_at)}
              </time>
            </div>
            {r.title ? <p className="font-medium">{r.title}</p> : null}
            <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{r.body}</p>
            {r.admin_reply ? (
              <div className="bg-muted/50 mt-3 rounded-lg border-r-2 border-primary p-3 text-xs">
                <p className="mb-1 font-medium text-primary">پاسخ فروشگاه</p>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {r.admin_reply}
                </p>
              </div>
            ) : null}
          </article>
        ))}
        {!items.length ? (
          <p className="text-muted-foreground text-sm">هنوز نظر تأییدشده‌ای نیست.</p>
        ) : null}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-primary">ثبت نظر</h3>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs">امتیاز</label>
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="border-input bg-background h-9 rounded-lg border px-2 text-sm"
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} ★
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان (اختیاری)"
            className="border-input bg-background h-9 min-w-[12rem] flex-1 rounded-lg border px-3 text-sm"
            dir="rtl"
          />
        </div>
        <ComposerInput
          onSend={onSend}
          placeholder="نظر خود را بنویسید... (بدون لینک و تصویر)"
          sendLabel="ارسال نظر"
          disabled={busy}
        />
        {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      </div>
    </section>
  );
}
