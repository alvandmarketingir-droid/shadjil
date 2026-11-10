"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminDashboardStatsAction } from "@/app/admin/actions/stats";
import { LumaSpin } from "@/components/ui/luma-spin";
import { useRtEvent } from "@/hooks/use-rt-event";
import { RT } from "@/lib/realtime/events";

type Stats = {
  ordersTotal: number;
  ordersPending: number;
  productsTotal: number;
  productsPublished: number;
  usersTotal: number;
  discountsActive: number;
  stockAlertsPending: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminDashboardStatsAction();
    setLoading(false);
    if (!res.ok) {
      setError(
        res.error === "login_required"
          ? "ورود لازم است"
          : res.error === "forbidden"
            ? "دسترسی ادمین ندارید"
            : "خطا در بارگذاری آمار",
      );
      return;
    }
    setStats(res.stats);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRtEvent(RT.orders, () => { void load(); });
  useRtEvent(RT.catalog, () => { void load(); });
  useRtEvent(RT.stock, () => { void load(); });
  useRtEvent(RT.support, () => { void load(); });
  useRtEvent(RT.returns, () => { void load(); });

  const cards = stats
    ? [
        {
          label: "سفارش‌ها",
          value: stats.ordersTotal,
          sub: `${stats.ordersPending} در انتظار`,
          href: "/admin/orders",
        },
        {
          label: "محصولات",
          value: stats.productsTotal,
          sub: `${stats.productsPublished} منتشر`,
          href: "/admin/products",
        },
        {
          label: "کاربران",
          value: stats.usersTotal,
          sub: "پروفایل‌ها",
          href: "/admin/users",
        },
        {
          label: "تخفیف فعال",
          value: stats.discountsActive,
          sub: "کوپن‌ها",
          href: "/admin/discounts",
        },
        {
          label: "گزارش فروش",
          value: "—",
          sub: "۷ / ۳۰ / ۹۰ روز",
          href: "/admin/reports",
        },
        {
          label: "لیست انتظار موجودی",
          value: stats.stockAlertsPending ?? 0,
          sub: "در انتظار اطلاع",
          href: "/admin/stock-alerts",
        },
      ]
    : [];

  return (
    <div className="p-6" dir="rtl">
      <div className="w-full max-w-none space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">داشبورد مدیریت</h1>
          </div>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        {loading ? (
          <div className="flex justify-center py-20">
            <LumaSpin />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {cards.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="border-border bg-card hover:border-primary/40 rounded-2xl border p-5 shadow-sm transition-colors"
              >
                <p className="text-muted-foreground text-xs">{c.label}</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">
                  {c.value.toLocaleString("fa-IR")}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">{c.sub}</p>
              </Link>
            ))}
          </div>
        )}

        <div className="border-border bg-card rounded-2xl border p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">دسترسی سریع</h2>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["/admin/orders", "سفارش‌ها"],
                ["/admin/products", "محصولات"],
                ["/admin/discounts", "تخفیف‌ها"],
                ["/admin/stock-alerts", "لیست انتظار"],
                ["/admin/users", "کاربران"],
              ] as const
            ).map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="border-border hover:bg-muted rounded-xl border px-4 py-2 text-sm"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
