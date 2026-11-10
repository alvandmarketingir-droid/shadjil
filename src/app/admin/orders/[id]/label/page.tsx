"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { adminGetOrderAction } from "@/app/admin/actions/orders";
import { formatJalaliDateTime } from "@/lib/dates/jalali";
import { toPersianDigits } from "@/lib/numbers";
import { iranPostTrackingUrl } from "@/lib/iran-post-tracking";
import { LumaSpin } from "@/components/ui/luma-spin";

export default function OrderWaybillLabelPage() {
  const params = useParams();
  const id = String(params?.id || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      const res = await adminGetOrderAction(id);
      setLoading(false);
      if (!res.ok || !res.order) {
        setError("سفارش یافت نشد یا دسترسی ندارید");
        return;
      }
      setOrder(res.order);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LumaSpin />
      </div>
    );
  }
  if (error || !order) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <p className="text-destructive">{error || "خطا"}</p>
        <Link href="/admin/orders" className="text-primary mt-4 inline-block underline">
          بازگشت به سفارش‌ها
        </Link>
      </div>
    );
  }

  const items = order.order_items ?? [];
  const tracking = order.tracking_number as string | null;

  return (
    <div className="mx-auto max-w-2xl p-4 print:p-0" dir="rtl">
      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <Link
          href="/admin/orders"
          className="border-border rounded-xl border px-4 py-2 text-sm"
        >
          بازگشت
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm"
        >
          چاپ برچسب / بارنامه
        </button>
      </div>

      <div className="border-border space-y-4 rounded-2xl border-2 border-dashed p-6 print:border-black">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-3">
          <div>
            <h1 className="text-xl font-bold">برچسب ارسال — شادجیل</h1>
            <p className="text-muted-foreground text-xs">shadjil.ir</p>
          </div>
          <div className="text-left font-mono text-xs" dir="ltr">
            <div>Order: {order.id}</div>
            <div className="text-muted-foreground">
              {order.created_at ? formatJalaliDateTime(order.created_at) : ""}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border p-3 text-sm">
            <p className="text-muted-foreground mb-1 text-xs font-medium">گیرنده</p>
            <p className="font-bold">{order.shipping_name || "—"}</p>
            <p dir="ltr" className="font-mono text-xs">
              {order.shipping_phone || ""}
            </p>
            <p className="mt-2 text-xs leading-6">
              {order.shipping_city ? `${order.shipping_city} — ` : ""}
              {order.shipping_address || "—"}
            </p>
            {order.shipping_postal ? (
              <p className="mt-1 text-xs">
                کد پستی:{" "}
                <span dir="ltr" className="font-mono">
                  {order.shipping_postal}
                </span>
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border p-3 text-sm">
            <p className="text-muted-foreground mb-1 text-xs font-medium">ارسال</p>
            <p>
              وضعیت:{" "}
              <span className="font-medium">{String(order.status || "—")}</span>
            </p>
            {tracking ? (
              <>
                <p className="mt-2">
                  کد رهگیری پست:{" "}
                  <span className="font-mono font-bold" dir="ltr">
                    {tracking}
                  </span>
                </p>
                <a
                  href={iranPostTrackingUrl(tracking)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary mt-1 inline-block text-xs underline print:hidden"
                >
                  پیگیری در پست
                </a>
              </>
            ) : (
              <p className="text-muted-foreground mt-2 text-xs">
                کد رهگیری هنوز ثبت نشده
              </p>
            )}
            <p className="mt-2 text-xs">
              مبلغ:{" "}
              {toPersianDigits(
                Math.round(Number(order.total_amount || 0)).toLocaleString("en-US"),
              )}{" "}
              تومان
            </p>
          </div>
        </div>

        <div>
          <p className="text-muted-foreground mb-2 text-xs font-medium">اقلام</p>
          <ul className="space-y-1 text-sm">
            {items.map((it: any) => (
              <li key={it.id} className="flex justify-between gap-2 border-b border-dashed py-1">
                <span>
                  {it.title}
                  {it.weight_name ? ` · ${it.weight_name}` : ""}
                  {it.roast_name ? ` · ${it.roast_name}` : ""}
                </span>
                <span className="shrink-0">
                  × {toPersianDigits(String(it.quantity || 1))}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {order.note ? (
          <p className="text-muted-foreground text-xs">یادداشت: {order.note}</p>
        ) : null}

        <p className="text-muted-foreground border-t pt-3 text-[10px] leading-5">
          این برچسب برای الصاق روی بسته و بایگانی داخلی است. رهگیری رسمی مرسوله از طریق
          کد رهگیری پست و سایت tracking.post.ir انجام می‌شود.
        </p>
      </div>
    </div>
  );
}
