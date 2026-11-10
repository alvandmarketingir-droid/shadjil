"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminBulkBar } from "@/components/admin/bulk-bar";
import {
  adminArchiveBlogPostsAction,
  adminHardDeleteBlogPostsAction,
  adminRestoreBlogPostsAction,
} from "@/app/admin/actions/lifecycle";
import {
  adminListBlogPostsAction,
  adminSetBlogPostStatusAction,
  adminCreateBlogPostAction,
} from "@/app/admin/actions/blog";
import { LumaSpin } from "@/components/ui/luma-spin";
import { toPersianDigits } from "@/lib/numbers";

type Post = {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  created_at: string;
  category?: { name: string } | null;
};

export default function AdminBlogPage() {
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published" | "archived">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  
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
    const res = await adminArchiveBlogPostsAction(selected);
    setBulkBusy(false);
    if (!res.ok) { setError("آرشیو ناموفق"); return; }
    setSelected([]);
    void load();
  }
  async function runBulkHardDelete() {
    if (!selected.length) return;
    if (!confirm("حذف دائمی موارد انتخاب‌شده؟ برگشت‌ناپذیر است.")) return;
    setBulkBusy(true);
    const res = await adminHardDeleteBlogPostsAction(selected);
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
    const res = await adminArchiveBlogPostsAction([id]);
    setBulkBusy(false);
    if (!res.ok) { setError("آرشیو ناموفق"); return; }
    void load();
  }
  async function hardDeleteOne(id: string, name: string) {
    if (!confirm(`حذف دائمی «${name}»؟`)) return;
    setBulkBusy(true);
    const res = await adminHardDeleteBlogPostsAction([id]);
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
    const res = await adminRestoreBlogPostsAction([id]);
    setBulkBusy(false);
    if (!res.ok) { setError("بازگردانی ناموفق"); return; }
    void load();
  }
  async function runBulkRestore() {
    if (!selected.length) return;
    if (!confirm("بازگردانی موارد انتخاب‌شده از بایگانی؟")) return;
    setBulkBusy(true);
    const res = await adminRestoreBlogPostsAction(selected);
    setBulkBusy(false);
    if (!res.ok) { setError("بازگردانی ناموفق"); return; }
    setSelected([]);
    void load();
  }
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminListBlogPostsAction();
    setLoading(false);
    if (!res.ok) {
      setError(
        res.error === "login_required"
          ? "ورود لازم است"
          : res.error === "forbidden"
            ? "دسترسی ادمین ندارید"
            : "خطا در بارگذاری پست‌ها",
      );
      setItems([]);
      return;
    }
    setItems(((res.items as unknown) as Post[]) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = items;
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (p) =>
        p.title.toLowerCase().includes(s) ||
        p.slug.toLowerCase().includes(s),
    );
  }, [items, q, statusFilter]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError(null);
    const res = await adminCreateBlogPostAction({ title: title.trim(), status: "draft" });
    setCreating(false);
    if (!res.ok) {
      setError(res.error === "title_required" ? "عنوان لازم است" : "ایجاد پست ناموفق");
      return;
    }
    setTitle("");
    await load();
  }

  async function setStatus(id: string, status: "draft" | "published" | "archived") {
    setBusyId(id);
    const res = await adminSetBlogPostStatusAction(id, status);
    setBusyId(null);
    if (!res.ok) {
      setError("تغییر وضعیت ناموفق بود");
      return;
    }
    setItems((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status,
              published_at:
                status === "published"
                  ? p.published_at ?? new Date().toISOString()
                  : p.published_at,
            }
          : p,
      ),
    );
  }

  return (
    <div className="bg-background min-h-screen space-y-6 p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">{showArchived ? "بایگانی بلاگ" : "بلاگ"}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => { setShowArchived((v) => !v); setSelected([]); setStatusFilter(showArchived ? "all" : "archived"); }}
            className={
              showArchived
                ? "bg-amber-600 text-white rounded-xl px-4 py-2 text-sm font-medium"
                : "border-border rounded-xl border px-4 py-2 text-sm"
            }
          >
            {showArchived ? "خروج از بایگانی" : "بایگانی"}
          </button>
          <Link
            href="/admin/blog/categories"
            className="border-border rounded-xl border px-4 py-2 text-sm"
          >
            دسته‌ها
          </Link>
          <Link
            href="/admin/blog/tags"
            className="border-border rounded-xl border px-4 py-2 text-sm"
          >
            برچسب‌ها
          </Link>
          <Link
            href="/admin/dashboard"
            className="border-border rounded-xl border px-4 py-2 text-sm"
          >
            داشبورد
          </Link>
        </div>
      </div>

      <form
        onSubmit={onCreate}
        className="border-border flex flex-wrap gap-2 rounded-2xl border p-4"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان پست جدید (پیش‌نویس)"
          className="border-border bg-background min-w-[200px] flex-1 rounded-xl border px-3 py-2 text-sm"
          required
        />
        <button
          type="submit"
          disabled={creating}
          className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm disabled:opacity-50"
        >
          {creating ? "…" : "افزودن پیش‌نویس"}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جستجوی آجیل، خشکبار، خرما..."ی آجیل و خشکبار عنوان یا اسلاگ…"
          className="border-border bg-background w-full max-w-md rounded-xl border px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as typeof statusFilter)
          }
          className="border-border bg-background rounded-xl border px-3 py-2 text-sm"
        >
          <option value="all">همه وضعیت‌ها</option>
          <option value="draft">پیش‌نویس</option>
          <option value="published">منتشرشده</option>
          <option value="archived">بایگانی</option>
        </select>
      </div>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <AdminBulkBar
          count={selected.length}
          total={items.length}
          onSelectAll={() => toggleSelectAll(items.map((x) => x.id))}
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
      ) : (
        <div className="table-scroll border-border overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 text-right">عنوان</th>
                <th className="p-3 text-right">اسلاگ</th>
                <th className="p-3 text-right">وضعیت</th>
                <th className="p-3 text-right">اقدام</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className={"border-t " + (p.status === "archived" ? "bg-amber-50/80 dark:bg-amber-950/30 opacity-80" : p.status === "draft" ? "bg-slate-50/60 dark:bg-slate-900/20" : "")}>
                  <td className="p-3 font-medium"><Link href={`/admin/blog/${p.id}/edit`} className="hover:underline"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleSelect(p.id)} /><span>{p.title}</span></label> <button type="button" className="text-muted-foreground text-xs" onClick={() => void (p.status === "archived" ? restoreOne(p.id, p.title) : archiveOne(p.id, p.title))}>{p.status === "archived" ? "بازگردانی" : "آرشیو"}</button> <button type="button" className="text-destructive text-xs" onClick={() => void hardDeleteOne(p.id, p.title)}>حذف دائمی</button></Link></td>
                  <td className="text-muted-foreground p-3 font-mono text-xs" dir="ltr">
                    {p.slug}
                  </td>
                  <td className="p-3 text-xs">
                    {p.status === "published"
                      ? "منتشر"
                      : p.status === "archived"
                        ? "بایگانی"
                        : "پیش‌نویس"}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {p.status !== "published" ? (
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          className="border-border rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
                          onClick={() => void setStatus(p.id, "published")}
                        >
                          انتشار
                        </button>
                      ) : null}
                      {p.status !== "draft" ? (
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          className="border-border rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
                          onClick={() => void setStatus(p.id, "draft")}
                        >
                          پیش‌نویس
                        </button>
                      ) : null}
                      {p.status !== "archived" ? (
                        <button
                          type="button"
                          disabled={busyId === p.id}
                          className="border-border rounded-lg border px-2 py-1 text-xs disabled:opacity-50"
                          onClick={() => void setStatus(p.id, "archived")}
                        >
                          بایگانی
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-muted-foreground p-6 text-center"
                  >
                    پستی نیست
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
