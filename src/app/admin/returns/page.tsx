"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRtEvent } from "@/hooks/use-rt-event";
import { RT } from "@/lib/realtime/events";
import { AdminBulkBar } from "@/components/admin/bulk-bar";
import {
  adminArchiveReturnsAction,
  adminHardDeleteReturnsAction,
} from "@/app/admin/actions/lifecycle";
import {
  adminListReturnsAction,
  adminSetReturnStatusAction,
} from "@/app/admin/actions/support";
import { LumaSpin } from "@/components/ui/luma-spin";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/dates/jalali";


type Row = {
  id: string;
  order_id: string;
  reason: string;
  status: string;
  admin_note?: string | null;
  created_at: string;
};

const STATUSES = [
  "pending",
  "approved",
  "rejected",
  "received",
  "refunded",
] as const;

const STATUS_FA: Record<string, string> = {
  pending: "در انتظار",
  approved: "تأیید",
  rejected: "رد",
  received: "دریافت شد",
  refunded: "عودت وجه",
};

export default function AdminReturnsPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  
  function toggleSelectAll(ids: string[]) {
    setSelected((prev) => (prev.length === ids.length ? [] : ids));
  }
  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }
  async function runBulkArchive() {
    if (!selected.length) return;
    if (!confirm("آرشیو موارد انتخاب‌شده؟")) return;
    setBulkBusy(true);
    const res = await adminArchiveReturnsAction(selected);
    setBulkBusy(false);
    if (!res.ok) { setError("آرشیو ناموفق"); return; }
    setSelected([]);
    void load();
  }
  async function runBulkHardDelete() {
    if (!selected.length) return;
    if (!confirm("حذف دائمی موارد انتخاب‌شده؟ برگشت‌ناپذیر است.")) return;
    setBulkBusy(true);
    const res = await adminHardDeleteReturnsAction(selected);
    setBulkBusy(false);
    if (!res.ok) {
      const map: Record<string, string> = {
        has_orders: "در سفارش‌ها استفاده شده",
        has_products: "به محصول متصل است",
      };
      setError(map[String(res.error)] ?? "حذف دائمی ناموفق");
      return;
    }
    setSelected([]);
    void load();
  }
  async function archiveOne(id: string, name: string) {
    if (!confirm(`آرشیو «${name}»؟`)) return;
    setBulkBusy(true);
    const res = await adminArchiveReturnsAction([id]);
    setBulkBusy(false);
    if (!res.ok) { setError("آرشیو ناموفق"); return; }
    void load();
  }
  async function hardDeleteOne(id: string, name: string) {
    if (!confirm(`حذف دائمی «${name}»؟`)) return;
    setBulkBusy(true);
    const res = await adminHardDeleteReturnsAction([id]);
    setBulkBusy(false);
    if (!res.ok) {
      const map: Record<string, string> = {
        has_orders: "در سفارش‌ها استفاده شده",
      };
      setError(map[String(res.error)] ?? "حذف دائمی ناموفق");
      return;
    }
    void load();
  }
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminListReturnsAction();
    setLoading(false);
    if (!res.ok) {
      setError(
        res.error === "login_required"
          ? "ورود لازم است"
          : res.error === "forbidden"
            ? "دسترسی ادمین ندارید"
            : "خطا در بارگذاری",
      );
      setItems([]);
      return;
    }
    setItems((res.items as Row[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRtEvent(RT.support, () => {
    void load();
  });
  useRtEvent(RT.returns, () => {
    void load();
  });

  async function setStatus(id: string, status: (typeof STATUSES)[number]) {
    setBusyId(id);
    const res = await adminSetReturnStatusAction(id, status);
    setBusyId(null);
    if (!res.ok) {
      setError("تغییر وضعیت ناموفق");
      return;
    }
    setItems((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    );
  }

  return (
    <div className="space-y-4 p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">درخواست‌های مرجوعی</h1>
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

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <AdminBulkBar
          total={items.length}
          onSelectAll={() => toggleSelectAll(items.map((x) => x.id))}
          onClear={() => setSelected([])}
          count={selected.length}
          busy={bulkBusy}
          onArchive={() => void runBulkArchive()}
          onHardDelete={() => void runBulkHardDelete()}
        />


      {loading ? (
        <div className="flex justify-center py-16">
          <LumaSpin />
        </div>
      ) : (
        <div className="table-scroll border-border overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-right font-medium">سفارش</th>
                <th className="p-3 text-right font-medium">دلیل</th>
                <th className="p-3 text-right font-medium">وضعیت</th>
                <th className="p-3 text-right font-medium">تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="p-3"><input type="checkbox" className="ml-2 align-middle" checked={selected.includes(r.id)} onChange={() => toggleSelect(r.id)} />
                    
                    <Link
                      href={`/admin/orders/${r.order_id}`}
                      className="text-primary font-mono text-xs hover:underline"
                    >
                      {r.order_id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="text-muted-foreground max-w-xs p-3 text-xs">
                    <p>{r.reason}</p>
                    {r.admin_note ? (
                      <p className="text-primary mt-1">یادداشت: {r.admin_note}</p>
                    ) : null}
                    {r.status === "refunded" ? (
                      <p className="mt-1 font-medium text-emerald-700 dark:text-emerald-400">
                        عودت وجه ثبت شد
                      </p>
                    ) : null}
                  </td>
                  <td className="p-3">
                    <select
                      className="border-input bg-background rounded-lg border px-2 py-1 text-xs"
                      value={r.status}
                      disabled={busyId === r.id}
                      onChange={(e) =>
                        void setStatus(
                          r.id,
                          e.target.value as (typeof STATUSES)[number],
                        )
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_FA[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="text-muted-foreground p-3 text-xs whitespace-nowrap">
                    {formatJalaliDate(r.created_at)}
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-muted-foreground p-6 text-center"
                  >
                    درخواستی نیست
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
