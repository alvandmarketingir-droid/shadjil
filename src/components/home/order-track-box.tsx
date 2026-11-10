"use client";

import { Price } from "@/components/ui/price";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toEnglishDigits } from "@/lib/numbers";
import { trackOrderAction } from "@/app/(shop)/actions/shop";
import { formatJalaliDate } from "@/lib/dates/jalali";
import { iranPostTrackingUrl } from "@/lib/iran-post-tracking";
import { useRtEvent } from "@/hooks/use-rt-event";
import { RT } from "@/lib/realtime/events";

const STATUS_FA: Record<string, string> = {
  pending: "در انتظار",
  paid: "پرداخت‌شده",
  processing: "در حال آماده‌سازی",
  shipped: "ارسال‌شده",
  delivered: "تحویل شده",
  cancelled: "لغو شده",
  refunded: "بازگشت وجه",
};

type TrackOrder = {
  id: string;
  status: string;
  total_amount: number;
  shipping_name?: string | null;
  shipping_city: string | null;
  tracking_number?: string | null;
  created_at: string;
  items: {
    id: string;
    title: string;
    weight_name?: string;
    roast_name?: string;
    quantity: number;
    line_total: number;
  }[];
};

export function OrderTrackBox() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackOrder | null>(null);

  async function fetchTrack(raw: string) {
    const normalized = toEnglishDigits(raw).trim();
    if (normalized.length < 8) {
      setError("کد سفارش خود را وارد کنید (شناسه کامل سفارش).");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await trackOrderAction(normalized);
      if (!res.ok) {
        setError(res.error || "سفارشی یافت نشد");
        setResult(null);
        return;
      }
      setResult(res.order as TrackOrder);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    await fetchTrack(code);
  }

  // به‌روزرسانی زنده وقتی ادمین وضعیت را عوض می‌کند
  useRtEvent(RT.orders, () => {
    if (result?.id) void fetchTrack(result.id);
  });

  useEffect(() => {
    if (!result?.id) return;
    const iv = window.setInterval(() => {
      void fetchTrack(result.id);
    }, 15000);
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.id]);

  return (
    <div className="bg-card space-y-4 rounded-2xl border p-5" dir="rtl">
      <h2 className="text-lg font-bold text-primary">پیگیری سفارش</h2>
      <p className="text-muted-foreground text-sm leading-7">
        کد سفارش خود را وارد کنید تا وضعیت خرید را ببینید.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="کد سفارش خود را وارد کنید"
          className="flex-1"
          dir="ltr"
        />
        <Button
          type="submit"
          suppressHydrationWarning
          variant="outline"
          disabled={loading}
          className="hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground"
        >
          {loading ? "جستجو…" : "پیگیری"}
        </Button>
      </form>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {result ? (
        <div className="border-border space-y-2 rounded-xl border p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold">
              {STATUS_FA[result.status] ?? result.status}
            </span>
            <span className="text-muted-foreground text-xs" dir="ltr">
              {result.id}
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            {result.created_at ? formatJalaliDate(result.created_at) : ""}
            {result.shipping_city ? ` · ${result.shipping_city}` : ""}
            {result.shipping_name ? ` · ${result.shipping_name}` : ""}
          </p>
          <p className="font-medium">
            <Price amount={result.total_amount || 0} weight="sm" />
          </p>
          {result.tracking_number ? (
            <div className="border-border mt-2 space-y-1 rounded-lg border bg-muted/30 p-3 text-xs">
              <p>
                <span className="text-muted-foreground">کد رهگیری ارسال: </span>
                <span className="font-mono font-bold" dir="ltr">
                  {result.tracking_number}
                </span>
              </p>
              <a
                href={iranPostTrackingUrl(result.tracking_number)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-block underline"
              >
                پیگیری مرسوله در سایت پست
              </a>
            </div>
          ) : null}
          <ul className="text-muted-foreground space-y-1 text-xs">
            {result.items.map((it) => (
              <li key={it.id}>
                {it.title}
                {it.weight_name ? ` · ${it.weight_name}` : ""}
                {it.quantity > 1 ? ` × ${it.quantity}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {mounted ? null : null}
    </div>
  );
}
