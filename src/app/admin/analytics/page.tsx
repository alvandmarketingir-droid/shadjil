"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Range = "today" | "7d" | "30d" | "90d";

const RANGES: { value: Range; label: string }[] = [
  { value: "today", label: "امروز" },
  { value: "7d", label: "۷ روز" },
  { value: "30d", label: "۳۰ روز" },
  { value: "90d", label: "۹۰ روز" },
];

const FUNNEL_STEPS = [
  { key: "view_item", label: "مشاهده محصول" },
  { key: "add_to_cart", label: "افزودن به سبد" },
  { key: "view_cart", label: "مشاهده سبد" },
  { key: "begin_checkout", label: "شروع تسویه" },
  { key: "purchase", label: "خرید" },
] as const;

function getDateFrom(range: Range): string {
  const now = new Date();
  if (range === "today") {
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  }
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  now.setDate(now.getDate() - days);
  return now.toISOString();
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<Range>("7d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [funnel, setFunnel] = useState<Record<string, number>>({});
  const [devices, setDevices] = useState<Record<string, number>>({});
  const [lowConvertProducts, setLowConvertProducts] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [returnCount, setReturnCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const from = getDateFrom(range);

      try {
        const { data: events, error: e1 } = await supabase
          .from("analytics_events")
          .select("event_name, value, device, product_id")
          .gte("created_at", from);

        if (e1) throw e1;

        const funnelCount: Record<string, number> = {};
        const deviceCount: Record<string, number> = {};
        let revenue = 0;

        for (const ev of events || []) {
          funnelCount[ev.event_name] = (funnelCount[ev.event_name] || 0) + 1;
          if (ev.device) {
            deviceCount[ev.device] = (deviceCount[ev.device] || 0) + 1;
          }
          if (ev.event_name === "purchase" && ev.value) {
            revenue += Number(ev.value);
          }
        }

        setFunnel(funnelCount);
        setDevices(deviceCount);
        setTotalRevenue(revenue);

        // View not in generated Database.Views (keeps .from(tableUnion) working).
        const { data: products, error: e2 } = await (supabase as any)
          .from("admin_product_performance")
          .select("*")
          .gt("views", 5)
          .order("views", { ascending: false })
          .limit(15);

        if (e2) {
          setLowConvertProducts([]);
        } else {
          const low = (products || [])
            .filter((p: { conversion_rate?: number }) => Number(p.conversion_rate) < 3)
            .slice(0, 10);
          setLowConvertProducts(low);
        }

        // نرخ مرجوعی
        const { count: retCount } = await supabase
          .from("return_requests")
          .select("id", { count: "exact", head: true })
          .gte("created_at", from);

        const { count: ordCount } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .gte("created_at", from);

        setReturnCount(retCount ?? 0);
        setOrderCount(ordCount ?? 0);
      } catch (err: any) {
        setError(err.message || "خطا در بارگذاری");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [range]);

  const getRate = (fromKey: string, toKey: string) => {
    const from = funnel[fromKey] || 0;
    const to = funnel[toKey] || 0;
    if (from === 0) return "—";
    return ((to / from) * 100).toFixed(1) + "%";
  };

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">قیف فروش و آمار</h1>
          <p className="text-sm text-muted-foreground mt-1">
            تحلیل رفتار خرید کاربران
          </p>
        </div>

        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                range === r.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">در حال بارگذاری...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <Kpi label="مشاهده محصول" value={(funnel.view_item || 0).toLocaleString("fa-IR")} />
            <Kpi label="افزودن به سبد" value={(funnel.add_to_cart || 0).toLocaleString("fa-IR")} />
            <Kpi label="خرید موفق" value={(funnel.purchase || 0).toLocaleString("fa-IR")} />
            <Kpi label="درآمد (تومان)" value={totalRevenue.toLocaleString("fa-IR")} />
            <Kpi
              label="نرخ مرجوعی"
              value={
                orderCount > 0
                  ? ((returnCount / orderCount) * 100).toFixed(1) + "%"
                  : "—"
              }
            />
          </div>

          <div className="rounded-2xl border bg-card p-6">
            <h2 className="mb-6 text-lg font-semibold">قیف خرید و نرخ تبدیل</h2>
            <div className="space-y-4">
              {FUNNEL_STEPS.map((step, i) => {
                const count = funnel[step.key] || 0;
                const prevKey = i > 0 ? FUNNEL_STEPS[i - 1].key : null;
                const rate = prevKey ? getRate(prevKey, step.key) : null;

                return (
                  <div key={step.key} className="flex items-center gap-4">
                    <div className="w-40 text-sm font-medium">{step.label}</div>
                    <div className="flex-1">
                      <div className="h-3 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${Math.min(100, (count / (funnel.view_item || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="w-20 text-left text-sm tabular-nums">
                      {count.toLocaleString("fa-IR")}
                    </div>
                    {rate && (
                      <div className="w-16 text-left text-xs text-muted-foreground">
                        {rate}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">تفکیک دستگاه</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {["mobile", "desktop", "tablet", "unknown"].map((d) => (
                <div key={d} className="rounded-xl bg-muted/50 p-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    {d === "mobile" ? "موبایل" : d === "desktop" ? "دسکتاپ" : d === "tablet" ? "تبلت" : "نامشخص"}
                  </p>
                  <p className="mt-1 text-xl font-bold">
                    {(devices[d] || 0).toLocaleString("fa-IR")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">محصولات پربازدید با تبدیل پایین</h2>
            {lowConvertProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                داده‌ای یافت نشد (ممکن است view هنوز ساخته نشده باشد)
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="pb-3 text-right font-medium">شناسه محصول</th>
                      <th className="pb-3 text-right font-medium">بازدید</th>
                      <th className="pb-3 text-right font-medium">افزودن به سبد</th>
                      <th className="pb-3 text-right font-medium">خرید</th>
                      <th className="pb-3 text-right font-medium">نرخ تبدیل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowConvertProducts.map((p: any) => (
                      <tr key={p.product_id} className="border-b last:border-0">
                        <td className="py-3 font-mono text-xs">{p.product_id}</td>
                        <td className="py-3">{p.views}</td>
                        <td className="py-3">{p.add_to_carts}</td>
                        <td className="py-3">{p.purchases}</td>
                        <td className="py-3 font-medium text-destructive">
                          {p.conversion_rate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
