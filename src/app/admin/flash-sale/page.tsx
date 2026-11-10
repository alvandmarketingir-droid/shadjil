"use client";
import { toJalaliInputValue, jalaliInputToIso } from "@/lib/dates/jalali";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  adminListProductsAction,
  adminUpdateProductFlagsAction,
} from "@/app/admin/actions/products";
import {
  adminGetFlashSaleSettingsAction,
  adminSetFlashSaleEndsAtAction,
} from "@/app/admin/actions/flash-sale";
import { LumaSpin } from "@/components/ui/luma-spin";
import { toPersianDigits } from "@/lib/numbers";

type Row = {
  id: string;
  name: string;
  slug: string;
  status: string;
  is_featured: boolean;
  brand?: { name: string } | null;
  category?: { name: string } | null;
};

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminFlashSalePage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [endsLocal, setEndsLocal] = useState("");
  const [savingEnds, setSavingEnds] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [prod, settings] = await Promise.all([
      adminListProductsAction(200),
      adminGetFlashSaleSettingsAction(),
    ]);
    setLoading(false);

    if (!prod.ok) {
      setError(
        prod.error === "login_required"
          ? "ورود لازم است"
          : prod.error === "forbidden"
            ? "دسترسی ادمین ندارید"
            : "خطا در بارگذاری محصولات",
      );
      setItems([]);
      return;
    }
    setItems((prod.items as Row[]) ?? []);

    if (settings.ok) {
      setEndsLocal(toJalaliInputValue(settings.endsAt));
      setTableMissing(Boolean((settings as { tableMissing?: boolean }).tableMissing));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        p.slug.toLowerCase().includes(s) ||
        (p.brand?.name ?? "").toLowerCase().includes(s),
    );
  }, [items, q]);

  const featuredCount = items.filter((p) => p.is_featured).length;

  async function toggleFeatured(id: string, next: boolean) {
    setBusyId(id);
    const res = await adminUpdateProductFlagsAction(id, { is_featured: next });
    setBusyId(null);
    if (!res.ok) {
      setError("ذخیره فلگ ناموفق بود");
      return;
    }
    setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_featured: next } : p)),
    );
  }

  async function saveEnds(e: React.FormEvent) {
    e.preventDefault();
    setSavingEnds(true);
    setError(null);
    const iso = endsLocal ? jalaliInputToIso(endsLocal) : null;
    const res = await adminSetFlashSaleEndsAtAction(iso);
    setSavingEnds(false);
    if (!res.ok) {
      setError(res.error || "ذخیره زمان ناموفق");
      return;
    }
    setTableMissing(false);
  }

  return (
    <div className="bg-background min-h-screen p-6" dir="rtl">
      <div className="w-full max-w-none space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary">پیشنهاد شگفت‌انگیز</h1>
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
              href="/admin/products"
              className="border-border rounded-xl border px-4 py-2 text-sm"
            >
              همه محصولات
            </Link>
          </div>
        </div>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        {tableMissing ? (
          <div className="border-destructive/40 bg-destructive/5 text-destructive rounded-xl border p-4 text-sm">
            جدول site_settings یافت نشد. SQL را در Supabase اجرا کنید.
          </div>
        ) : null}

        <form
          onSubmit={(e) => void saveEnds(e)}
          className="border-border space-y-3 rounded-2xl border p-4"
        >
          <h2 className="font-semibold text-primary">زمان پایان فروش</h2>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block text-sm">
              <span className="text-muted-foreground mb-1 block text-xs">
                تاریخ و ساعت پایان
              </span>
              <input
                type="text" inputMode="numeric" placeholder="1404/07/06 15:30" dir="ltr"
                value={endsLocal}
                onChange={(e) => setEndsLocal(e.target.value)}
                className="border-input bg-background h-10 rounded-xl border px-3 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={savingEnds}
              className="bg-primary text-primary-foreground h-10 rounded-xl px-5 text-sm font-medium disabled:opacity-60"
            >
              {savingEnds ? "..." : "ذخیره زمان"}
            </button>
            <button
              type="button"
              className="border-border h-10 rounded-xl border px-4 text-sm"
              onClick={() => setEndsLocal("")}
            >
              پاک کردن
            </button>
          </div>
        </form>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-primary">
              محصولات در پیشنهاد ({toPersianDigits(String(featuredCount))} فعال)
            </h2>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجوی محصول..."
              className="border-input bg-background h-9 w-full max-w-xs rounded-xl border px-3 text-sm"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <LumaSpin />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              محصولی یافت نشد.
            </p>
          ) : (
            <div className="table-scroll border-border overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[640px] text-right text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="p-3 font-medium">شگفت‌انگیز</th>
                    <th className="p-3 font-medium">نام</th>
                    <th className="p-3 font-medium">دسته / برچسب</th>
                    <th className="p-3 font-medium">وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-border border-t">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          checked={!!p.is_featured}
                          disabled={busyId === p.id}
                          onChange={(e) =>
                            void toggleFeatured(p.id, e.target.checked)
                          }
                        />
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-muted-foreground font-mono text-xs">
                          {p.slug}
                        </div>
                      </td>
                      <td className="text-muted-foreground p-3 text-xs">
                        {p.category?.name ?? "-"} / {p.brand?.name ?? "-"}
                      </td>
                      <td className="p-3 text-xs">{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
