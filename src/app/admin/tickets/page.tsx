"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminBulkBar } from "@/components/admin/bulk-bar";
import {
  adminArchiveTicketsAction,
  adminHardDeleteTicketsAction,
} from "@/app/admin/actions/lifecycle";
import {
  adminListTicketsAction,
  adminSetTicketStatusAction,
  adminReplyTicketAction,
} from "@/app/admin/actions/support";
import { LumaSpin } from "@/components/ui/luma-spin";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/dates/jalali";
import { useRtEvent } from "@/hooks/use-rt-event";
import { RT } from "@/lib/realtime/events";


type Row = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
};

const STATUS_FA: Record<string, string> = {
  open: "باز",
  in_progress: "در حال بررسی",
  closed: "بسته",
};

const PRIORITY_FA: Record<string, string> = {
  low: "کم",
  normal: "عادی",
  high: "بالا",
  urgent: "فوری",
};

export default function AdminTicketsPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "open" | "in_progress" | "closed"
  >("all");
  const [reply, setReply] = useState<Record<string, string>>({});

  
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
    const res = await adminArchiveTicketsAction(selected);
    setBulkBusy(false);
    if (!res.ok) { setError("آرشیو ناموفق"); return; }
    setSelected([]);
    void load();
  }
  async function runBulkHardDelete() {
    if (!selected.length) return;
    if (!confirm("حذف دائمی موارد انتخاب‌شده؟ برگشت‌ناپذیر است.")) return;
    setBulkBusy(true);
    const res = await adminHardDeleteTicketsAction(selected);
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
    const res = await adminArchiveTicketsAction([id]);
    setBulkBusy(false);
    if (!res.ok) { setError("آرشیو ناموفق"); return; }
    void load();
  }
  async function hardDeleteOne(id: string, name: string) {
    if (!confirm(`حذف دائمی «${name}»؟`)) return;
    setBulkBusy(true);
    const res = await adminHardDeleteTicketsAction([id]);
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
    const res = await adminListTicketsAction({ status: statusFilter });
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
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useRtEvent(RT.support, () => {
    void load();
  });

  async function setStatus(id: string, status: "open" | "in_progress" | "closed") {
    setBusyId(id);
    const res = await adminSetTicketStatusAction(id, status);
    setBusyId(null);
    if (!res.ok) {
      setError("تغییر وضعیت ناموفق");
      return;
    }
    if (statusFilter !== "all" && statusFilter !== status) {
      setItems((prev) => prev.filter((t) => t.id !== id));
    } else {
      setItems((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status } : t)),
      );
    }
  }

  async function sendReply(id: string) {
    const text = (reply[id] || "").trim();
    if (!text) return;
    setBusyId(id);
    const res = await adminReplyTicketAction(id, text);
    setBusyId(null);
    if (!res.ok) {
      setError(
        res.error === "has_link_or_image"
          ? "لینک و تصویر در پاسخ مجاز نیست"
          : "ارسال پاسخ ناموفق",
      );
      return;
    }
    setReply((r) => ({ ...r, [id]: "" }));
    void load();
  }

  return (
    <div className="space-y-4 p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">تیکت‌های پشتیبانی</h1>
          </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as "all" | "open" | "in_progress" | "closed",
              )
            }
            className="border-input bg-background h-10 rounded-xl border px-3 text-sm"
          >
            <option value="all">همه</option>
            <option value="open">باز</option>
            <option value="in_progress">در حال بررسی</option>
            <option value="closed">بسته</option>
          </select>
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
      ) : items.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">تیکتی نیست</p>
      ) : (
        <div className="space-y-3">
          {items.map((t) => (
            <div
              key={t.id}
              className="border-border rounded-xl border p-4 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggleSelect(t.id)} /><span>{t.subject}</span></label> <button type="button" className="text-muted-foreground text-xs" onClick={() => void archiveOne(t.id, String(t.subject || t.id))}>آرشیو</button> <button type="button" className="text-destructive text-xs" onClick={() => void hardDeleteOne(t.id, String(t.subject || t.id))}>حذف دائمی</button></p>
                <select
                  className="border-input bg-background rounded-lg border px-2 py-1 text-xs"
                  value={t.status}
                  disabled={busyId === t.id}
                  onChange={(e) =>
                    void setStatus(
                      t.id,
                      e.target.value as "open" | "in_progress" | "closed",
                    )
                  }
                >
                  {(["open", "in_progress", "closed"] as const).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_FA[s]}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {formatJalaliDateTime(t.created_at)} ·{" "}
                {PRIORITY_FA[t.priority] ?? t.priority}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  className="border-input bg-background h-9 min-w-[12rem] flex-1 rounded-lg border px-2 text-sm"
                  placeholder="پاسخ ادمین…"
                  value={reply[t.id] ?? ""}
                  disabled={busyId === t.id}
                  onChange={(e) =>
                    setReply((r) => ({ ...r, [t.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void sendReply(t.id);
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={busyId === t.id || !(reply[t.id] || "").trim()}
                  onClick={() => void sendReply(t.id)}
                  className="bg-primary text-primary-foreground h-9 rounded-lg px-4 text-xs font-medium disabled:opacity-50"
                >
                  ارسال
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
