"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminListNewsletterAction,
  adminUnsubscribeNewsletterAction,
  adminResubscribeNewsletterAction,
  type NewsletterRow,
} from "@/app/admin/actions/newsletter";
import { LumaSpin } from "@/components/ui/luma-spin";
import { formatJalaliDateTime } from "@/lib/dates/jalali";
import { toPersianDigits } from "@/lib/numbers";

export default function AdminClubPage() {
  const [items, setItems] = useState<NewsletterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "out">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminListNewsletterAction();
    setLoading(false);
    if (!res.ok) {
      setError(
        res.error === "login_required"
          ? "ورود لازم است"
          : res.error === "forbidden"
            ? "دسترسی ادمین ندارید"
            : res.error === "db"
              ? "خطای دیتابیس — جدول newsletter_subscribers را در Supabase بسازید"
              : "خطا در بارگذاری",
      );
      setItems([]);
      return;
    }
    setItems(res.items);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim();
    return items.filter((row) => {
      if (filter === "active" && row.unsubscribed_at) return false;
      if (filter === "out" && !row.unsubscribed_at) return false;
      if (!needle) return true;
      return row.phone.includes(needle) || row.phone.includes(
        needle.replace(/[۰-۹]/g, (d) =>
          String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)),
        ),
      );
    });
  }, [items, q, filter]);

  const counts = useMemo(() => {
    const active = items.filter((x) => !x.unsubscribed_at).length;
    return {
      all: items.length,
      active,
      out: items.length - active,
    };
  }, [items]);

  async function onUnsub(id: string) {
    setBusyId(id);
    const res = await adminUnsubscribeNewsletterAction(id);
    setBusyId(null);
    if (!res.ok) {
      setError("لغو عضویت ناموفق");
      return;
    }
    await load();
  }

  async function onResub(id: string) {
    setBusyId(id);
    const res = await adminResubscribeNewsletterAction(id);
    setBusyId(null);
    if (!res.ok) {
      setError("فعال‌سازی ناموفق");
      return;
    }
    await load();
  }

  function exportCsv() {
    const lines = ["phone,source,created_at,status"];
    for (const r of filtered) {
      lines.push(
        [
          r.phone,
          r.source || "",
          r.created_at,
          r.unsubscribed_at ? "unsubscribed" : "active",
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "club-members.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 p-2 sm:p-4" dir="rtl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">باشگاه مشتریان</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            شماره‌هایی که فرم «از آخرین تخفیف‌ها باخبر شوید» را پر کرده‌اند
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!filtered.length}
          className="border-border rounded-xl border px-3 py-2 text-sm disabled:opacity-50"
        >
          خروجی CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          className={
            "rounded-lg border px-3 py-1.5 " +
            (filter === "all" ? "bg-primary text-primary-foreground" : "")
          }
          onClick={() => setFilter("all")}
        >
          همه ({toPersianDigits(String(counts.all))})
        </button>
        <button
          type="button"
          className={
            "rounded-lg border px-3 py-1.5 " +
            (filter === "active" ? "bg-primary text-primary-foreground" : "")
          }
          onClick={() => setFilter("active")}
        >
          فعال ({toPersianDigits(String(counts.active))})
        </button>
        <button
          type="button"
          className={
            "rounded-lg border px-3 py-1.5 " +
            (filter === "out" ? "bg-primary text-primary-foreground" : "")
          }
          onClick={() => setFilter("out")}
        >
          لغو شده ({toPersianDigits(String(counts.out))})
        </button>
        <input
          className="border-border bg-background mr-auto min-w-[12rem] flex-1 rounded-xl border px-3 py-2 text-sm"
          placeholder="جستجوی شماره…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          inputMode="tel"
        />
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <LumaSpin />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          عضوی ثبت نشده است.
        </p>
      ) : (
        <div className="border-border overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[32rem] text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr className="border-b text-right">
                <th className="px-3 py-2 font-medium">موبایل</th>
                <th className="px-3 py-2 font-medium">منبع</th>
                <th className="px-3 py-2 font-medium">تاریخ عضویت</th>
                <th className="px-3 py-2 font-medium">وضعیت</th>
                <th className="px-3 py-2 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const active = !row.unsubscribed_at;
                return (
                  <tr key={row.id} className="border-border border-b last:border-0">
                    <td className="px-3 py-2 font-mono tabular-nums" dir="ltr">
                      {toPersianDigits(row.phone)}
                    </td>
                    <td className="text-muted-foreground px-3 py-2">
                      {row.source === "home" ? "فرم خانه" : row.source || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {formatJalaliDateTime(row.created_at)}
                    </td>
                    <td className="px-3 py-2">
                      {active ? (
                        <span className="text-primary">فعال</span>
                      ) : (
                        <span className="text-muted-foreground">لغو شده</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {active ? (
                        <button
                          type="button"
                          className="text-destructive text-xs hover:underline"
                          disabled={busyId === row.id}
                          onClick={() => void onUnsub(row.id)}
                        >
                          لغو عضویت
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="text-primary text-xs hover:underline"
                          disabled={busyId === row.id}
                          onClick={() => void onResub(row.id)}
                        >
                          فعال‌سازی دوباره
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
