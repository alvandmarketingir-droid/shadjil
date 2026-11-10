"use client";

import { useRtEvent } from "@/hooks/use-rt-event";
import { RT } from "@/lib/realtime/events";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminListLogsAction, type AdminLogRow } from "@/app/admin/actions/logs";
import { LumaSpin } from "@/components/ui/luma-spin";
import { formatJalaliDateTime } from "@/lib/dates/jalali";


export default function AdminLogsPage() {
  const [items, setItems] = useState<AdminLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminListLogsAction(100);
    setLoading(false);
    if (!res.ok) {
      setError(
        res.error === "login_required"
          ? "ورود لازم است"
          : res.error === "forbidden"
            ? "دسترسی ادمین ندارید"
            : "خطا در بارگذاری لاگ‌ها",
      );
      setItems([]);
      return;
    }
    setItems(res.items ?? []);
    setTableMissing(Boolean((res as { tableMissing?: boolean }).tableMissing));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRtEvent(RT.orders, () => {
    void load();
  });
  useRtEvent(RT.support, () => {
    void load();
  });
  useRtEvent(RT.catalog, () => {
    void load();
  });

  return (
    <div className="bg-background min-h-screen space-y-6 p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">لاگ فعالیت ادمین</h1>
          </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="border-border rounded-xl border px-4 py-2 text-sm"
          >
            تازه‌سازی
          </button>
          <Link
            href="/admin/dashboard"
            className="border-border rounded-xl border px-4 py-2 text-sm"
          >
            داشبورد
          </Link>
        </div>
      </div>

      {tableMissing ? (
        <div className="border-amber-300/50 bg-amber-500/10 rounded-2xl border p-4 text-sm">
          جدول <code className="mx-1">admin_logs</code> هنوز ساخته نشده.
          اسکریپت SQL ساخت جدول را در SQL Editor اجرا کنید.
        </div>
      ) : null}

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <LumaSpin />
        </div>
      ) : (
        <div className="table-scroll border-border overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-right">زمان</th>
                <th className="p-3 text-right">اقدام</th>
                <th className="p-3 text-right">موجودیت</th>
                <th className="p-3 text-right">جزئیات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="text-muted-foreground whitespace-nowrap p-3 text-xs">
                    {formatJalaliDateTime(row.created_at)}
                  </td>
                  <td className="p-3 font-medium">{row.action}</td>
                  <td className="text-muted-foreground p-3 text-xs">
                    {row.entity ?? "—"}
                    {row.entity_id ? (
                      <span className="mr-1 font-mono">
                        ({row.entity_id.slice(0, 8)}…)
                      </span>
                    ) : null}
                  </td>
                  <td className="text-muted-foreground max-w-xs truncate p-3 text-xs">
                    {row.meta ?? "—"}
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={4} className="text-muted-foreground p-6 text-center">
                    لاگی ثبت نشده
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
