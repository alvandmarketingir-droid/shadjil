"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminBulkBar } from "@/components/admin/bulk-bar";
import {
  adminArchiveDiscountsAction,
  adminHardDeleteDiscountsAction,
} from "@/app/admin/actions/lifecycle";
import {
  adminCreateDiscountAction,
  adminListDiscountsAction,
  adminSetDiscountActiveAction,
} from "@/app/admin/actions/discounts";
import { LumaSpin } from "@/components/ui/luma-spin";
import { formatJalaliDate, formatJalaliDateTime, jalaliInputToIso } from "@/lib/dates/jalali";


type Row = {
  id: string;
  code: string;
  type: string;
  value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  used_count: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  once_per_user?: boolean;
  created_at: string;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return formatJalaliDate(iso);
  } catch {
    return "—";
  }
}

export default function AdminDiscountsPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");

  const [form, setForm] = useState({
    code: "",
    type: "percentage" as "percentage" | "fixed",
    value: "20",
    min_order_amount: "0",
    max_uses: "",
    starts_at: "",
    ends_at: "",
    once_per_user: false,
    max_discount_amount: "",
    product_ids: "",
    category_ids: "",
  });

  
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
    const res = await adminArchiveDiscountsAction(selected);
    setBulkBusy(false);
    if (!res.ok) { setError("آرشیو ناموفق"); return; }
    setSelected([]);
    void load();
  }
  async function runBulkHardDelete() {
    if (!selected.length) return;
    if (!confirm("حذف دائمی موارد انتخاب‌شده؟ برگشت‌ناپذیر است.")) return;
    setBulkBusy(true);
    const res = await adminHardDeleteDiscountsAction(selected);
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
    const res = await adminArchiveDiscountsAction([id]);
    setBulkBusy(false);
    if (!res.ok) { setError("آرشیو ناموفق"); return; }
    void load();
  }
  async function hardDeleteOne(id: string, name: string) {
    if (!confirm(`حذف دائمی «${name}»؟`)) return;
    setBulkBusy(true);
    const res = await adminHardDeleteDiscountsAction([id]);
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
    const res = await adminListDiscountsAction(100);
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

  const filtered = useMemo(() => {
    const s = q.trim().toUpperCase();
    if (!s) return items;
    return items.filter((d) => d.code.toUpperCase().includes(s));
  }, [items, q]);

  async function toggleActive(id: string, isActive: boolean) {
    setBusyId(id);
    const res = await adminSetDiscountActiveAction(id, isActive);
    setBusyId(null);
    if (!res.ok) {
      setError("تغییر وضعیت ناموفق بود");
      return;
    }
    setItems((prev) =>
      prev.map((d) => (d.id === id ? { ...d, is_active: isActive } : d)),
    );
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const res = await adminCreateDiscountAction({
      code: form.code,
      type: form.type,
      value: Number(form.value),
      min_order_amount: form.min_order_amount
        ? Number(form.min_order_amount)
        : 0,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      starts_at: form.starts_at
        ? jalaliInputToIso(form.starts_at)
        : null,
      ends_at: form.ends_at ? jalaliInputToIso(form.ends_at) : null,
      once_per_user: form.once_per_user,
      max_discount_amount: form.max_discount_amount
        ? Number(form.max_discount_amount)
        : null,
      product_ids: form.product_ids || null,
      category_ids: form.category_ids || null,
    });
    setCreating(false);
    if (!res.ok) {
      setError(
        res.error === "bad_code"
          ? "کد نامعتبر"
          : res.error === "bad_value"
            ? "مقدار نامعتبر"
            : res.error === "bad_percent"
              ? "درصد حداکثر ۱۰۰"
              : "ایجاد ناموفق (احتمالاً کد تکراری)",
      );
      return;
    }
    setForm({
      code: "",
      type: "percentage",
      value: "20",
      min_order_amount: "0",
      max_uses: "",
      starts_at: "",
      ends_at: "",
      once_per_user: false,
      max_discount_amount: "",
      product_ids: "",
      category_ids: "",
    });
    void load();
  }

  return (
    <div className="bg-background min-h-screen p-6" dir="rtl">
      <div className="w-full max-w-none space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary">کدهای تخفیف</h1>
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


        <form
          onSubmit={onCreate}
          className="border-border bg-card grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <input
            placeholder="کد (مثلاً WELCOME20)"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            className="border-input bg-background h-10 rounded-xl border px-3 text-sm"
            dir="ltr"
            required
          />
          <select
            value={form.type}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                type: e.target.value as "percentage" | "fixed",
              }))
            }
            className="border-input bg-background h-10 rounded-xl border px-3 text-sm"
          >
            <option value="percentage">درصدی</option>
            <option value="fixed">مبلغ ثابت</option>
          </select>
          <input
            type="number"
            min={0}
            step="any"
            placeholder="مقدار"
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            className="border-input bg-background h-10 rounded-xl border px-3 text-sm"
            required
          />
          <input
            type="number"
            min={0}
            placeholder="حداقل سبد"
            value={form.min_order_amount}
            onChange={(e) =>
              setForm((f) => ({ ...f, min_order_amount: e.target.value }))
            }
            className="border-input bg-background h-10 rounded-xl border px-3 text-sm"
          />
          <input
            type="number"
            min={0}
            placeholder="سقف استفاده (خالی = ∞)"
            value={form.max_uses}
            onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
            className="border-input bg-background h-10 rounded-xl border px-3 text-sm"
          />
          <label className="text-muted-foreground flex flex-col gap-1 text-xs">
            شروع اعتبار
            <input
              type="text" inputMode="numeric" placeholder="1404/07/06 15:30" dir="ltr"
              value={form.starts_at}
              onChange={(e) =>
                setForm((f) => ({ ...f, starts_at: e.target.value }))
              }
              className="border-input bg-background h-10 rounded-xl border px-3 text-sm text-foreground"
            />
          </label>
          <label className="text-muted-foreground flex flex-col gap-1 text-xs">
            پایان اعتبار
            <input
              type="text" inputMode="numeric" placeholder="1404/07/06 15:30" dir="ltr"
              value={form.ends_at}
              onChange={(e) =>
                setForm((f) => ({ ...f, ends_at: e.target.value }))
              }
              className="border-input bg-background h-10 rounded-xl border px-3 text-sm text-foreground"
            />
          </label>
          <label className="text-muted-foreground flex h-10 items-center gap-2 text-sm sm:col-span-2 lg:col-span-1">
            <input
              type="checkbox"
              checked={form.once_per_user}
              onChange={(e) =>
                setForm((f) => ({ ...f, once_per_user: e.target.checked }))
              }
              className="h-4 w-4"
            />
            یک‌بار برای هر کاربر
          </label>
          <input
            type="number"
            min={0}
            placeholder="سقف مبلغ تخفیف (تومان)"
            value={form.max_discount_amount}
            onChange={(e) =>
              setForm((f) => ({ ...f, max_discount_amount: e.target.value }))
            }
            className="border-input bg-background h-10 rounded-xl border px-3 text-sm"
          />
          <input
            placeholder="UUID محصولات (کاما، خالی=همه)"
            value={form.product_ids}
            onChange={(e) =>
              setForm((f) => ({ ...f, product_ids: e.target.value }))
            }
            className="border-input bg-background h-10 rounded-xl border px-3 text-sm sm:col-span-2"
            dir="ltr"
          />
          <input
            placeholder="UUID دسته‌ها (کاما، خالی=همه)"
            value={form.category_ids}
            onChange={(e) =>
              setForm((f) => ({ ...f, category_ids: e.target.value }))
            }
            className="border-input bg-background h-10 rounded-xl border px-3 text-sm sm:col-span-2"
            dir="ltr"
          />
          <button
            type="submit"
            disabled={creating}
            className="bg-primary text-primary-foreground h-10 rounded-xl text-sm font-medium disabled:opacity-60 sm:col-span-2 lg:col-span-1"
          >
            {creating ? "…" : "ایجاد"}
          </button>
        </form>

        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جستجوی کد…"
          className="border-input bg-background h-10 w-full max-w-xs rounded-xl border px-3 text-sm"
          dir="ltr"
        />

        {loading ? (
          <div className="flex justify-center py-16">
            <LumaSpin />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            کدی یافت نشد.
          </p>
        ) : (
          <div className="table-scroll border-border overflow-x-auto rounded-2xl border">
            <table className="w-full min-w-[720px] text-right text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">کد</th>
                  <th className="p-3 font-medium">نوع / مقدار</th>
                  <th className="p-3 font-medium">استفاده</th>
                  <th className="p-3 font-medium">حداقل</th>
                  <th className="p-3 font-medium">اعتبار</th>
                  <th className="p-3 font-medium">یک‌بار/کاربر</th>
                  <th className="p-3 font-medium">فعال</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-border border-t">
                    <td className="p-3 font-mono font-medium"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggleSelect(d.id)} /><span>{d.code}</span></label> <button type="button" className="text-muted-foreground text-xs" onClick={() => void archiveOne(d.id, String(d.code || d.id))}>آرشیو</button> <button type="button" className="text-destructive text-xs" onClick={() => void hardDeleteOne(d.id, String(d.code || d.id))}>حذف دائمی</button></td>
                    <td className="p-3">
                      {d.type === "percentage" || d.type === "percent"
                        ? `${d.value}٪`
                        : `${Number(d.value).toLocaleString("fa-IR")} تومان`}
                    </td>
                    <td className="p-3 text-xs">
                      {Number(d.used_count ?? 0)}
                      {d.max_uses != null ? ` / ${d.max_uses}` : " / ∞"}
                    </td>
                    <td className="p-3 text-xs">
                      {Number(d.min_order_amount ?? 0).toLocaleString("fa-IR")}
                    </td>
                    <td className="text-muted-foreground p-3 text-xs">
                      {fmtDate(d.starts_at)} → {fmtDate(d.ends_at)}
                    </td>
                    <td className="p-3 text-xs">
                      {d.once_per_user ? "بله" : "—"}
                    </td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={!!d.is_active}
                        disabled={busyId === d.id}
                        onChange={(e) =>
                          void toggleActive(d.id, e.target.checked)
                        }
                        className="h-4 w-4"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
