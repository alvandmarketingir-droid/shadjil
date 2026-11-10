"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminBulkBar } from "@/components/admin/bulk-bar";
import {
  adminArchiveCategoriesAction,
  adminHardDeleteCategoriesAction,
  adminRestoreCategoriesAction,
} from "@/app/admin/actions/lifecycle";
import {
  adminListCategoriesAction,
  adminCreateCategoryAction,
  adminUpdateCategoryAction,
} from "@/app/admin/actions/catalog";
import { LumaSpin } from "@/components/ui/luma-spin";

type Row = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order?: number;
  parent_id?: string | null;
};

export default function AdminPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "archived">("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [parentId, setParentId] = useState("");

  function toggleSelectAll(ids: string[]) {
    setSelected((prev) =>
      prev.length === ids.length && ids.every((id) => prev.includes(id)) ? [] : [...ids],
    );
  }
  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function runBulkArchive() {
    if (!selected.length) return;
    if (!confirm("آرشیو موارد انتخاب‌شده؟")) return;
    setBulkBusy(true);
    const res = await adminArchiveCategoriesAction(selected);
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
    const res = await adminHardDeleteCategoriesAction(selected);
    setBulkBusy(false);
    if (!res.ok) {
      const map: Record<string, string> = {
        has_products: "هنوز محصول وابسته دارد",
        has_children: "زیردسته دارد",
        has_orders: "سفارش ثبت‌شده دارد",
        forbidden: "دسترسی کافی نیست",
        empty: "موردی انتخاب نشده",
        server: "خطای سرور",
      };
      setError(map[String(res.error)] ?? "حذف دائمی ناموفق");
      return;
    }
    setSelected([]);
    void load();
  }
  async function archiveOne(id: string, n: string) {
    if (!confirm(`آرشیو «${n}»؟`)) return;
    setBulkBusy(true);
    const res = await adminArchiveCategoriesAction([id]);
    setBulkBusy(false);
    if (!res.ok) {
      setError("آرشیو ناموفق");
      return;
    }
    void load();
  }
  async function hardDeleteOne(id: string, n: string) {
    if (!confirm(`حذف دائمی «${n}»؟`)) return;
    setBulkBusy(true);
    const res = await adminHardDeleteCategoriesAction([id]);
    setBulkBusy(false);
    if (!res.ok) {
      const map: Record<string, string> = {
        has_products: "هنوز محصول وابسته دارد",
        has_children: "زیردسته دارد",
        server: "خطای سرور",
      };
      setError(map[String(res.error)] ?? "حذف دائمی ناموفق");
      return;
    }
    void load();
  }
  async function restoreOne(id: string, n: string) {
    if (!confirm(`بازگردانی «${n}» از بایگانی؟`)) return;
    setBulkBusy(true);
    const res = await adminRestoreCategoriesAction([id]);
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
    const res = await adminRestoreCategoriesAction(selected);
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
    const res = await adminListCategoriesAction();
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

  const byId = useMemo(() => {
    const m = new Map<string, Row>();
    for (const x of items) m.set(x.id, x);
    return m;
  }, [items]);

  /** مرتب‌سازی بر اساس سلسله‌مراتبی: ریشه، بعد فرزندانش */
  const visible = useMemo(() => {
    let list = items;
    if (showArchived || statusFilter === "archived") list = list.filter((x) => !x.is_active);
    else if (statusFilter === "active") list = list.filter((x) => x.is_active);
    const s = q.trim().toLowerCase();
    if (s) {
      list = list.filter(
        (x) =>
          x.name.toLowerCase().includes(s) ||
          (x.slug || "").toLowerCase().includes(s) ||
          (x.parent_id && (byId.get(x.parent_id)?.name || "").toLowerCase().includes(s)),
      );
    }

    const roots = list
      .filter((x) => !x.parent_id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, "fa"));
    const childrenOf = (pid: string) =>
      list
        .filter((x) => x.parent_id === pid)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, "fa"));

    const ordered: Row[] = [];
    const used = new Set<string>();
    for (const r of roots) {
      ordered.push(r);
      used.add(r.id);
      for (const ch of childrenOf(r.id)) {
        ordered.push(ch);
        used.add(ch.id);
      }
    }
    // یتیم‌ها (والد فیلتر شده یا حذف شده)
    for (const x of list) {
      if (!used.has(x.id)) ordered.push(x);
    }
    return ordered;
  }, [items, q, showArchived, statusFilter, byId]);

  const rootOptions = useMemo(
    () => items.filter((c) => !c.parent_id && c.is_active).sort((a, b) => a.name.localeCompare(b.name, "fa")),
    [items],
  );

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    const res = await adminCreateCategoryAction({ name: name.trim(), parent_id: parentId || null });
    setCreating(false);
    if (!res.ok) {
      setError(res.error === "bad_name" || res.error === "name_required" ? "نام نامعتبر" : "ایجاد ناموفق");
      return;
    }
    setName("");
    setParentId("");
    void load();
  }

  async function save(
    id: string,
    patch: { name?: string; is_active?: boolean; sort_order?: number; parent_id?: string | null },
  ) {
    setBusyId(id);
    const res = await adminUpdateCategoryAction(id, patch);
    setBusyId(null);
    if (!res.ok) {
      setError("ذخیره ناموفق");
      return;
    }
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <div className="bg-background min-h-screen p-6" dir="rtl">
      <div className="w-full max-w-none space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary">
              {showArchived ? "بایگانی دسته‌بندی‌ها" : "دسته‌بندی‌ها"}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/categories/new"
              className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium"
            >
              دسته جدید
            </Link>
            <button
              type="button"
              onClick={() => {
                setShowArchived((v) => !v);
                setStatusFilter("");
                setSelected([]);
              }}
              className={
                showArchived
                  ? "bg-amber-600 text-white rounded-xl px-4 py-2 text-sm font-medium"
                  : "border-border rounded-xl border px-4 py-2 text-sm"
              }
            >
              {showArchived ? "خروج از بایگانی" : "بایگانی"}
            </button>
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

        <form
          onSubmit={onCreate}
          className="border-border bg-card flex flex-wrap items-center gap-2 rounded-2xl border p-4"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="نام دسته جدید"
            className="border-input bg-background h-10 min-w-[12rem] flex-1 rounded-xl border px-3 text-sm"
            required
          />
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="border-input bg-background h-10 rounded-xl border px-3 text-sm"
          >
            <option value="">دسته اصلی (بدون والد)</option>
            {rootOptions.map((c) => (
              <option key={c.id} value={c.id}>
                زیردستهٔ «{c.name}»
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={creating}
            className="bg-primary text-primary-foreground h-10 rounded-xl px-5 text-sm font-medium disabled:opacity-60"
          >
            {creating ? "…" : "افزودن"}
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجوی آجیل، خشکبار، خرما..."ی آجیل و خشکبار نام، اسلاگ یا والد…"
            className="border-input bg-background h-10 min-w-[200px] flex-1 rounded-xl border px-3 text-sm"
          />
          <select
            value={showArchived ? "archived" : statusFilter}
            onChange={(e) => {
              const v = e.target.value as "" | "active" | "archived";
              setStatusFilter(v === "archived" ? "archived" : v);
              setShowArchived(v === "archived");
              setSelected([]);
            }}
            className="border-input bg-background h-10 rounded-xl border px-3 text-sm"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="active">فعال</option>
            <option value="archived">بایگانی</option>
          </select>
        </div>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        <AdminBulkBar
          count={selected.length}
          total={visible.length}
          onSelectAll={() => toggleSelectAll(visible.map((x) => x.id))}
          busy={bulkBusy}
          onArchive={() => void (showArchived ? runBulkRestore() : runBulkArchive())}
          onHardDelete={() => void runBulkHardDelete()}
          onClear={() => setSelected([])}
          archiveLabel={showArchived ? "بازگردانی" : "آرشیو"}
        />

        {loading ? (
          <div className="flex justify-center py-16">
            <LumaSpin />
          </div>
        ) : visible.length === 0 ? (
          <div className="border-border rounded-2xl border py-16 text-center">
            <p className="text-muted-foreground text-sm">دسته‌ای یافت نشد.</p>
          </div>
        ) : (
          <div className="table-scroll border-border overflow-x-auto rounded-2xl border">
            <table className="w-full min-w-[820px] text-right text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr className="whitespace-nowrap">
                  <th className="p-2 font-medium"> </th>
                  <th className="p-2 font-medium">نام</th>
                  <th className="p-2 font-medium">سطح / والد</th>
                  <th className="p-2 font-medium">اسلاگ</th>
                  <th className="p-2 font-medium">ترتیب</th>
                  <th className="p-2 font-medium">وضعیت</th>
                  <th className="p-2 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const isChild = Boolean(r.parent_id);
                  const parentName = r.parent_id ? byId.get(r.parent_id)?.name : null;
                  return (
                    <tr
                      key={r.id}
                      className={
                        "border-border border-t whitespace-nowrap " +
                        (!r.is_active ? "bg-amber-50/80 dark:bg-amber-950/30 opacity-80 " : "") +
                        (isChild ? "bg-muted/20" : "")
                      }
                    >
                      <td className="p-2 align-middle">
                        <input
                          type="checkbox"
                          checked={selected.includes(r.id)}
                          onChange={() => toggleSelect(r.id)}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="p-2 align-middle">
                        <div className={"flex items-center gap-1 " + (isChild ? "pr-5" : "")}>
                          {isChild ? (
                            <span className="text-muted-foreground text-xs" aria-hidden>
                              └
                            </span>
                          ) : null}
                          <input
                            defaultValue={r.name}
                            disabled={busyId === r.id}
                            className={
                              "border-input bg-background h-8 min-w-[120px] max-w-[220px] rounded-lg border px-2 text-xs " +
                              (isChild ? "font-normal" : "font-semibold")
                            }
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v && v !== r.name) void save(r.id, { name: v });
                            }}
                          />
                        </div>
                      </td>
                      <td className="p-2 align-middle">
                        <select
                          value={r.parent_id || ""}
                          disabled={busyId === r.id}
                          className="border-input bg-background h-8 max-w-[180px] rounded-lg border px-2 text-xs"
                          onChange={(e) => {
                            const next = e.target.value || null;
                            if (next === r.id) return;
                            void save(r.id, { parent_id: next });
                          }}
                        >
                          <option value="">دسته اصلی</option>
                          {rootOptions
                            .filter((c) => c.id !== r.id)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                زیردستهٔ {c.name}
                              </option>
                            ))}
                        </select>
                        {isChild && parentName ? (
                          <p className="text-muted-foreground mt-0.5 text-[10px]">زیر «{parentName}»</p>
                        ) : (
                          <p className="text-muted-foreground mt-0.5 text-[10px]">ریشه</p>
                        )}
                      </td>
                      <td className="text-muted-foreground p-2 align-middle font-mono text-xs" dir="ltr">
                        {r.slug}
                      </td>
                      <td className="p-2 align-middle">
                        <input
                          type="number"
                          defaultValue={r.sort_order ?? 0}
                          disabled={busyId === r.id}
                          className="border-input bg-background h-8 w-16 rounded-lg border px-2 text-xs tabular-nums"
                          onBlur={(e) => {
                            const n = Number(e.target.value);
                            if (Number.isFinite(n) && n !== r.sort_order) void save(r.id, { sort_order: n });
                          }}
                        />
                      </td>
                      <td className="p-2 align-middle">
                        <span
                          className={
                            "inline-flex rounded-lg border px-2 py-1 text-xs " +
                            (r.is_active
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100"
                              : "border-amber-400 bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100")
                          }
                        >
                          {r.is_active ? "فعال" : "بایگانی"}
                        </span>
                      </td>
                      <td className="p-2 align-middle">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/categories/${r.id}/edit`}
                            className="text-sky-700 text-xs hover:underline dark:text-sky-400"
                          >
                            ویرایش
                          </Link>
                          {!r.is_active ? (
                            <button
                              type="button"
                              className="text-primary text-xs hover:underline"
                              onClick={() => void restoreOne(r.id, r.name)}
                            >
                              بازگردانی
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="text-muted-foreground text-xs hover:underline"
                              onClick={() => void archiveOne(r.id, r.name)}
                            >
                              آرشیو
                            </button>
                          )}
                          <button
                            type="button"
                            className="text-destructive text-xs hover:underline"
                            onClick={() => void hardDeleteOne(r.id, r.name)}
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
