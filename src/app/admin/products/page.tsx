"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminBulkBar } from "@/components/admin/bulk-bar";
import {
  adminArchiveProductsAction,
  adminHardDeleteProductsAction,
} from "@/app/admin/actions/lifecycle";
import { adminRestoreProductsAction } from "@/app/admin/actions/products";
import {
  adminListProductsAction,
  adminUpdateProductFlagsAction,
  adminListCategoriesAction,
  adminListBrandsAction,
  adminQuickUpdateProductAction,
  adminSetProductOutOfStockAction,
} from "@/app/admin/actions/products";
import { LumaSpin } from "@/components/ui/luma-spin";
import { formatJalaliDateTime } from "@/lib/dates/jalali";

import { toPersianDigits } from "@/lib/numbers";

const STATUSES = ["draft", "published", "archived"] as const;

const STATUS_FA: Record<string, string> = {
  draft: "پیش‌نویس",
  published: "منتشر",
  archived: "بایگانی",
};

type Opt = { id: string; name: string };
type Row = {
  id: string;
  name: string;
  slug: string;
  status: string;
  deleted_at?: string | null;
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  created_at: string;
  updated_at?: string | null;
  published_at?: string | null;
  category_id?: string | null;
  brand_id?: string | null;
  brand?: { id?: string; name: string } | null;
  category?: { id?: string; name: string } | null;
  thumb_url?: string | null;
  /** UI-only: بعد از تیک ناموجود */
  oos?: boolean;
};

function fmtWhen(iso?: string | null) {
  if (!iso) return "—";
  try {
    return toPersianDigits(formatJalaliDateTime(iso));
  } catch {
    return toPersianDigits(String(iso).slice(0, 16).replace("T", " "));
  }
}

export default function AdminProductsPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [cats, setCats] = useState<Opt[]>([]);
  const [brands, setBrands] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editName, setEditName] = useState<Record<string, string>>({});
  /** تغییرات pending تا زدن به‌روزرسانی */
  const [pending, setPending] = useState<
    Record<string, { name?: string; category_id?: string | null; brand_id?: string | null }>
  >({});

  function toggleSelectAll(ids: string[]) {
    setSelected((prev) =>
      prev.length === ids.length && ids.every((id) => prev.includes(id))
        ? []
        : [...ids],
    );
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
    const res = await adminArchiveProductsAction(selected);
    setBulkBusy(false);
    if (!res.ok) {
      setError("آرشیو ناموفق");
      return;
    }
    setSelected([]);
    void load();
  }
  async function runBulkHardDelete() {
    if (!selected.length) return;
    if (!confirm("حذف دائمی موارد انتخاب‌شده؟ برگشت‌ناپذیر است.")) return;
    setBulkBusy(true);
    const res = await adminHardDeleteProductsAction(selected);
    setBulkBusy(false);
    if (!res.ok) {
      const map: Record<string, string> = {
        has_products: "به محصول متصل است",
        has_orders: "در سفارش‌ها استفاده شده",
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
    const res = await adminArchiveProductsAction([id]);
    setBulkBusy(false);
    if (!res.ok) {
      setError("آرشیو ناموفق");
      return;
    }
    void load();
  }
  async function hardDeleteOne(id: string, name: string) {
    if (!confirm(`حذف دائمی «${name}»؟`)) return;
    setBulkBusy(true);
    const res = await adminHardDeleteProductsAction([id]);
    setBulkBusy(false);
    if (!res.ok) {
      const map: Record<string, string> = {
        has_products: "به محصول متصل است",
        has_orders: "در سفارش‌ها استفاده شده",
      };
      setError(map[String(res.error)] ?? "حذف دائمی ناموفق");
      return;
    }
    void load();
  }

  async function restoreOne(id: string, name: string) {
    if (!confirm(`بازگردانی «${name}» از بایگانی؟`)) return;
    setBulkBusy(true);
    const res = await adminRestoreProductsAction([id]);
    setBulkBusy(false);
    if (!res.ok) {
      setError("بازگردانی ناموفق");
      return;
    }
    void load();
  }
  async function runBulkRestore() {
    if (!selected.length) return;
    if (!confirm("بازگردانی موارد انتخاب‌شده از بایگانی؟")) return;
    setBulkBusy(true);
    const res = await adminRestoreProductsAction(selected);
    setBulkBusy(false);
    if (!res.ok) {
      setError("بازگردانی ناموفق");
      return;
    }
    setSelected([]);
    void load();
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [res, cRes, bRes] = await Promise.all([
      adminListProductsAction(100, {
        q: q.trim() || undefined,
        status: statusFilter || undefined,
      }),
      adminListCategoriesAction(),
      adminListBrandsAction(),
    ]);
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
    if (cRes.ok) setCats((cRes.items as Opt[]) ?? []);
    if (bRes.ok) setBrands((bRes.items as Opt[]) ?? []);
  }, [q, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(
    id: string,
    flags: Parameters<typeof adminUpdateProductFlagsAction>[1],
  ) {
    setBusyId(id);
    const res = await adminUpdateProductFlagsAction(id, flags);
    setBusyId(null);
    if (!res.ok) {
      setError("ذخیره ناموفق بود");
      return;
    }
    setItems((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, ...flags };
        if (flags.status === "archived") {
          next.deleted_at = next.deleted_at || new Date().toISOString();
          next.status = "archived";
        } else if (flags.status === "draft" || flags.status === "published") {
          next.deleted_at = null;
        }
        return next;
      }),
    );
  }

  async function quick(
    id: string,
    body: Parameters<typeof adminQuickUpdateProductAction>[1],
  ) {
    setBusyId(id);
    const res = await adminQuickUpdateProductAction(id, body);
    setBusyId(null);
    if (!res.ok) {
      setError("ذخیره ناموفق بود");
      return;
    }
    setItems((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p };
        if (body.name !== undefined) next.name = body.name;
        if (body.category_id !== undefined) {
          next.category_id = body.category_id;
          next.category = cats.find((c) => c.id === body.category_id)
            ? { id: body.category_id!, name: cats.find((c) => c.id === body.category_id)!.name }
            : null;
        }
        if (body.brand_id !== undefined) {
          next.brand_id = body.brand_id;
          next.brand = brands.find((b) => b.id === body.brand_id)
            ? { id: body.brand_id!, name: brands.find((b) => b.id === body.brand_id)!.name }
            : null;
        }
        return next;
      }),
    );
  }

  async function toggleOos(id: string, out: boolean) {
    setBusyId(id);
    const res = await adminSetProductOutOfStockAction(id, out);
    setBusyId(null);
    if (!res.ok) {
      setError("به‌روزرسانی موجودی ناموفق");
      return;
    }
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, oos: out } : p)));
  }


  return (
    <div className="bg-background min-h-screen p-6" dir="rtl">
      <div className="w-full max-w-none space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary">
              {statusFilter === "archived" ? "بایگانی محصولات" : "محصولات"}
            </h1>
            </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/products/new"
              className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium"
            >
              محصول جدید
            </Link>
            <button
              type="button"
              onClick={() => {
                setStatusFilter((prev) => (prev === "archived" ? "" : "archived"));
                setSelected([]);
              }}
              className={
                statusFilter === "archived"
                  ? "bg-amber-600 text-white rounded-xl px-4 py-2 text-sm font-medium"
                  : "border-border rounded-xl border px-4 py-2 text-sm"
              }
            >
              {statusFilter === "archived" ? "خروج از بایگانی" : "بایگانی"}
            </button>
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

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجوی نام یا اسلاگ…"
            className="border-input bg-background h-10 min-w-[200px] flex-1 rounded-xl border px-3 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border-input bg-background h-10 rounded-xl border px-3 text-sm"
          >
            <option value="">همه وضعیت‌ها</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_FA[s]}
              </option>
            ))}
          </select>
        </div>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <AdminBulkBar
          count={selected.length}
          total={items.length}
          onSelectAll={() => toggleSelectAll(items.map((x) => x.id))}
          busy={bulkBusy}
          onArchive={() => void (statusFilter === "archived" ? runBulkRestore() : runBulkArchive())}
          onHardDelete={() => void runBulkHardDelete()}
          onClear={() => setSelected([])}
          archiveLabel={statusFilter === "archived" ? "بازگردانی" : "آرشیو"}
        />

        {loading ? (
          <div className="flex justify-center py-16">
            <LumaSpin />
          </div>
        ) : items.length === 0 ? (
          <div className="border-border rounded-2xl border py-16 text-center">
            <p className="text-muted-foreground text-sm">محصولی یافت نشد.</p>
            <Link
              href="/admin/products/new"
              className="text-primary mt-3 inline-block text-sm hover:underline"
            >
              افزودن اولین محصول
            </Link>
          </div>
        ) : (
          <div className="table-scroll border-border overflow-x-auto rounded-2xl border">
            <table className="w-full min-w-[1100px] text-right text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr className="whitespace-nowrap">
                  <th className="p-2 font-medium"> </th>
                  <th className="p-2 font-medium">تصویر</th>
                  <th className="p-2 font-medium">نام</th>
                  <th className="p-2 font-medium">دسته</th>
                  <th className="p-2 font-medium">برچسب‌ها</th>
                  <th className="p-2 font-medium">وضعیت</th>
                  <th className="p-2 font-medium">ناموجود</th>
                  <th className="p-2 font-medium">شگفت</th>
                  <th className="p-2 font-medium">جدید</th>
                  <th className="p-2 font-medium">پرفروش</th>
                  <th className="p-2 font-medium">آخرین به‌روزرسانی</th>
                  <th className="p-2 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => {
                  const nameVal = editName[p.id] ?? p.name;
                  const when = p.updated_at || p.published_at || p.created_at;
                  return (
                    <tr
                      key={p.id}
                      className={
                        "border-border border-t whitespace-nowrap " +
                        (p.status === "archived" || p.deleted_at
                          ? "bg-amber-50/80 dark:bg-amber-950/30 opacity-80"
                          : p.status === "draft"
                            ? "bg-slate-50/60 dark:bg-slate-900/20"
                            : "")
                      }
                    >
                      <td className="p-2 align-middle">
                        <input
                          type="checkbox"
                          checked={selected.includes(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="p-2 align-middle">
                        <div className="bg-muted relative h-10 w-10 overflow-hidden rounded-lg">
                          {p.thumb_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.thumb_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-muted-foreground flex h-full items-center justify-center text-[10px]">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2 align-middle">
                        <input
                          value={nameVal}
                          disabled={busyId === p.id}
                          onChange={(e) =>
                            setEditName((m) => ({ ...m, [p.id]: e.target.value }))
                          }
                          onBlur={() => {
                            const next = (editName[p.id] ?? p.name).trim();
                            if (next && next !== p.name) {
                              setPending((m) => ({
                                ...m,
                                [p.id]: { ...m[p.id], name: next },
                              }));
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className="border-input bg-background h-8 min-w-[140px] max-w-[220px] rounded-lg border px-2 text-xs font-medium"
                          title="فقط نام — اسلاگ ثابت می‌ماند"
                        />
                      </td>
                      <td className="p-2 align-middle">
                        <select
                          value={p.category_id || p.category?.id || ""}
                          disabled={busyId === p.id}
                          onChange={(e) => {
                            const v = e.target.value || null;
                            setPending((m) => ({
                              ...m,
                              [p.id]: { ...m[p.id], category_id: v },
                            }));
                            setItems((prev) =>
                              prev.map((x) =>
                                x.id === p.id
                                  ? {
                                      ...x,
                                      category_id: v,
                                      category: cats.find((c) => c.id === v)
                                        ? { id: v!, name: cats.find((c) => c.id === v)!.name }
                                        : null,
                                    }
                                  : x,
                              ),
                            );
                          }}
                          className="border-input bg-background h-8 max-w-[140px] rounded-lg border px-1 text-xs"
                        >
                          <option value="">— دسته —</option>
                          {cats.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 align-middle">
                        <select
                          value={p.brand_id || p.brand?.id || ""}
                          disabled={busyId === p.id}
                          onChange={(e) => {
                            const v = e.target.value || null;
                            setPending((m) => ({
                              ...m,
                              [p.id]: { ...m[p.id], brand_id: v },
                            }));
                            setItems((prev) =>
                              prev.map((x) =>
                                x.id === p.id
                                  ? {
                                      ...x,
                                      brand_id: v,
                                      brand: brands.find((b) => b.id === v)
                                        ? { id: v!, name: brands.find((b) => b.id === v)!.name }
                                        : null,
                                    }
                                  : x,
                              ),
                            );
                          }}
                          className="border-input bg-background h-8 max-w-[140px] rounded-lg border px-1 text-xs"
                        >
                          <option value="">— برچسب —</option>
                          {brands.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 align-middle">
                        <select
                          value={p.deleted_at ? "archived" : p.status}
                          disabled={busyId === p.id}
                          onChange={(e) =>
                            void patch(p.id, {
                              status: e.target.value as
                                | "draft"
                                | "published"
                                | "archived",
                            })
                          }
                          className={
                            "h-8 rounded-lg border px-1 text-xs " +
                            (p.status === "archived" || p.deleted_at
                              ? "border-amber-400 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
                              : p.status === "draft"
                                ? "border-slate-300 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100")
                          }
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_FA[s] ?? s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 align-middle text-center">
                        <input
                          type="checkbox"
                          title="ناموجود کردن سریع (موجودی همه واریانت‌ها صفر)"
                          checked={!!p.oos}
                          disabled={busyId === p.id}
                          onChange={(e) => void toggleOos(p.id, e.target.checked)}
                          className="h-4 w-4"
                        />
                      </td>
                      {(
                        [
                          ["is_featured", p.is_featured],
                          ["is_new", p.is_new],
                          ["is_bestseller", p.is_bestseller],
                        ] as const
                      ).map(([key, val]) => (
                        <td key={key} className="p-2 align-middle text-center">
                          <input
                            type="checkbox"
                            checked={!!val}
                            disabled={busyId === p.id}
                            onChange={(e) =>
                              void patch(p.id, { [key]: e.target.checked })
                            }
                            className="h-4 w-4"
                          />
                        </td>
                      ))}
                      <td
                        className="text-muted-foreground p-2 align-middle text-[11px] tabular-nums"
                        title={when || ""}
                      >
                        {fmtWhen(when)}
                      </td>
                      <td className="p-2 align-middle">
                        <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busyId === p.id || !pending[p.id]}
                          onClick={() => {
                            const body = pending[p.id];
                            if (!body) return;
                            void (async () => {
                              await quick(p.id, body);
                              setPending((m) => {
                                const n = { ...m };
                                delete n[p.id];
                                return n;
                              });
                              setEditName((m) => {
                                const n = { ...m };
                                delete n[p.id];
                                return n;
                              });
                            })();
                          }}
                          className="text-secondary text-xs font-medium hover:underline disabled:opacity-40"
                        >
                          به‌روزرسانی
                        </button>
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="text-primary text-xs hover:underline"
                          >
                            ویرایش
                          </Link>
                          <Link
                            href={`/products/${p.slug}`}
                            target="_blank"
                            className="text-muted-foreground text-xs hover:underline"
                          >
                            مشاهده
                          </Link>
                          {statusFilter === "archived" || p.status === "archived" ? (
                            <button
                              type="button"
                              className="text-primary text-xs hover:underline"
                              onClick={() => void restoreOne(p.id, p.name)}
                            >
                              بازگردانی
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="text-muted-foreground text-xs hover:underline"
                              onClick={() => void archiveOne(p.id, p.name)}
                            >
                              آرشیو
                            </button>
                          )}
                          <button
                            type="button"
                            className="text-destructive text-xs hover:underline"
                            onClick={() => void hardDeleteOne(p.id, p.name)}
                          >
                            حذف دائمی
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
