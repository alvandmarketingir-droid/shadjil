"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminBulkBar } from "@/components/admin/bulk-bar";
import {
  adminArchiveStockAlertsAction,
  adminHardDeleteStockAlertsAction,
} from "@/app/admin/actions/lifecycle";
import {
  adminListStockAlertsAction,
  adminSetStockAlertStatusAction,
  type AdminStockAlertRow,
} from "@/app/admin/actions/stock-alerts";
import { LumaSpin } from "@/components/ui/luma-spin";
import { formatJalaliDateTime } from "@/lib/dates/jalali";

const STATUSES = ["all", "pending", "notified", "cancelled"] as const;
const STATUS_FA: Record<string, string> = {
  all: "همه",
  pending: "در انتظار",
  notified: "اطلاع داده شد",
  cancelled: "لغو",
};

export default function AdminStockAlertsPage() {
  const [items, setItems] = useState<AdminStockAlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("pending");
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
    const res = await adminArchiveStockAlertsAction(selected);
    setBulkBusy(false);
    if (!res.ok) { setError("آرشیو ناموفق"); return; }
    setSelected([]);
    void load();
  }
  async function runBulkHardDelete() {
    if (!selected.length) return;
    if (!confirm("حذف دائمی موارد انتخاب‌شده؟ برگشت‌ناپذیر است.")) return;
    setBulkBusy(true);
    const res = await adminHardDeleteStockAlertsAction(selected);
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
    const res = await adminArchiveStockAlertsAction([id]);
    setBulkBusy(false);
    if (!res.ok) { setError("آرشیو ناموفق"); return; }
    void load();
  }
  async function hardDeleteOne(id: string, name: string) {
    if (!confirm(`حذف دائمی «${name}»؟`)) return;
    setBulkBusy(true);
    const res = await adminHardDeleteStockAlertsAction([id]);
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
    const res = await adminListStockAlertsAction({ status });
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
    setItems(res.items ?? []);
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setRowStatus(id: string, next: "pending" | "notified" | "cancelled") {
    setBusyId(id);
    const res = await adminSetStockAlertStatusAction(id, next);
    setBusyId(null);
    if (!res.ok) {
      setError("تغییر وضعیت ناموفق");
      return;
    }
    void load();
  }

  return (
    <div className="space-y-4 p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">لیست انتظار موجودی</h1>
          </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="border-input bg-background rounded-xl border px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_FA[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="border-border rounded-xl border px-4 py-2 text-sm"
          >
            تازه‌سازی
          </button>
          <Link href="/admin/dashboard" className="border-border rounded-xl border px-4 py-2 text-sm">
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
      ) : items.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">موردی نیست.</p>
      ) : (
        <div className="table-scroll border-border overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-right font-medium">محصول</th>
                <th className="p-3 text-right font-medium">واریانت</th>
                <th className="p-3 text-right font-medium">موجودی</th>
                <th className="p-3 text-right font-medium">تماس</th>
                <th className="p-3 text-right font-medium">وضعیت</th>
                <th className="p-3 text-right font-medium">زمان</th>
                <th className="p-3 text-right font-medium">اقدام</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="p-3 text-xs"><input type="checkbox" className="ml-2 align-middle" checked={selected.includes(r.id)} onChange={() => toggleSelect(r.id)} />
                    
                    {r.product_id ? (
                      <Link href={`/admin/products/${r.product_id}`} className="text-primary hover:underline">
                        {r.product_name || r.product_id.slice(0, 8)}
                      </Link>
                    ) : (
                      r.product_name || "—"
                    )}
                  </td>
                  <td className="text-muted-foreground p-3 text-xs">
                    {[r.weight, r.roast_name].filter(Boolean).join(" / ") || r.variant_id.slice(0, 8)}
                  </td>
                  <td className="p-3 tabular-nums text-xs">
                    {r.stock_quantity != null ? r.stock_quantity.toLocaleString("fa-IR") : "—"}
                  </td>
                  <td className="p-3 font-mono text-xs" dir="ltr">
                    {r.phone || (r.user_id ? "user" : "—")}
                  </td>
                  <td className="p-3 text-xs">{STATUS_FA[r.status] ?? r.status}</td>
                  <td className="text-muted-foreground whitespace-nowrap p-3 text-xs">
                    {formatJalaliDateTime(r.created_at)}
                  </td>
                  <td className="p-3">
                    {r.status === "pending" ? (
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          className="border-border rounded-lg border px-2 py-1 text-xs"
                          onClick={() => void setRowStatus(r.id, "notified")}
                        >
                          اطلاع شد
                        </button>
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          className="border-border rounded-lg border px-2 py-1 text-xs"
                          onClick={() => void setRowStatus(r.id, "cancelled")}
                        >
                          لغو
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
