"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminBulkBar } from "@/components/admin/bulk-bar";
import {
  adminArchiveUsersAction,
  adminHardDeleteUsersAction,
} from "@/app/admin/actions/lifecycle";
import {
  adminListUsersAction,
  adminUpdateUserRoleAction,
} from "@/app/admin/actions/users";
import { LumaSpin } from "@/components/ui/luma-spin";
import { formatJalaliDate } from "@/lib/dates/jalali";


const ROLES = ["customer", "staff", "admin"] as const;

const ROLE_FA: Record<string, string> = {
  customer: "مشتری",
  staff: "کارمند",
  admin: "ادمین",
};

type Row = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
};

export default function AdminUsersPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  
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
    const res = await adminArchiveUsersAction(selected);
    setBulkBusy(false);
    if (!res.ok) { setError("آرشیو ناموفق"); return; }
    setSelected([]);
    void load();
  }
  async function runBulkHardDelete() {
    if (!selected.length) return;
    if (!confirm("حذف دائمی موارد انتخاب‌شده؟ برگشت‌ناپذیر است.")) return;
    setBulkBusy(true);
    const res = await adminHardDeleteUsersAction(selected);
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
  async function _archiveOne(id: string, name: string) {
    if (!confirm(`آرشیو «${name}»؟`)) return;
    setBulkBusy(true);
    const res = await adminArchiveUsersAction([id]);
    setBulkBusy(false);
    if (!res.ok) { setError("آرشیو ناموفق"); return; }
    void load();
  }
  async function _hardDeleteOne(id: string, name: string) {
    if (!confirm(`حذف دائمی «${name}»؟`)) return;
    setBulkBusy(true);
    const res = await adminHardDeleteUsersAction([id]);
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
    const res = await adminListUsersAction(100, {
      q: q.trim() || undefined,
      role: roleFilter || undefined,
    });
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
  }, [q, roleFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeRole(id: string, role: string) {
    setBusyId(id);
    const res = await adminUpdateUserRoleAction(
      id,
      role as "customer" | "staff" | "admin",
    );
    setBusyId(null);
    if (!res.ok) {
      setError(
        res.error === "cannot_demote_self"
          ? "نمی‌توانید نقش خودتان را از ادمین بردارید"
          : "تغییر نقش ناموفق بود",
      );
      return;
    }
    setItems((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
  }

  return (
    <div className="bg-background min-h-screen p-6" dir="rtl">
      <div className="w-full max-w-none space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary">کاربران</h1>
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

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجوی نام یا موبایل…"
            className="border-input bg-background h-10 min-w-[200px] flex-1 rounded-xl border px-3 text-sm"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border-input bg-background h-10 rounded-xl border px-3 text-sm"
          >
            <option value="">همه نقش‌ها</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_FA[r]}
              </option>
            ))}
          </select>
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
          <p className="text-muted-foreground py-12 text-center text-sm">
            کاربری یافت نشد.
          </p>
        ) : (
          <div className="table-scroll border-border overflow-x-auto rounded-2xl border">
            <table className="w-full min-w-[640px] text-right text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">نام</th>
                  <th className="p-3 font-medium">موبایل</th>
                  <th className="p-3 font-medium">نقش</th>
                  <th className="p-3 font-medium">عضویت</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id} className="border-border border-t">
                    <td className="p-3 font-medium"><input type="checkbox" className="ml-2 align-middle" checked={selected.includes(u.id)} onChange={() => toggleSelect(u.id)} />
                    
                      {u.full_name?.trim() || "—"}
                      <div className="text-muted-foreground font-mono text-[10px]">
                        {u.id.slice(0, 8)}…
                      </div>
                    </td>
                    <td className="p-3 font-mono text-xs" dir="ltr">
                      {u.phone || "—"}
                    </td>
                    <td className="p-3">
                      <select
                        value={u.role}
                        disabled={busyId === u.id}
                        onChange={(e) => void changeRole(u.id, e.target.value)}
                        className="border-input bg-background h-9 rounded-lg border px-2 text-xs"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_FA[r] ?? r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="text-muted-foreground p-3 text-xs whitespace-nowrap">
                      {formatJalaliDate(u.created_at)}
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
