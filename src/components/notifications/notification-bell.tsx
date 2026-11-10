"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotifications } from "@/lib/notifications/use-notifications";
import { cn } from "@/lib/utils";
import { LumaSpin } from "@/components/ui/luma-spin";
import { formatJalaliDate } from "@/lib/dates/jalali";


type Props = {
  className?: string;
  /** استایل مشابه آیکون‌های هدر */
  variant?: "header" | "plain";
};

export function NotificationBell({ className, variant = "header" }: Props) {
  const { items, loading, unread, markRead, markAll, refresh } = useNotifications(true);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    void refresh();
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, refresh]);

  const btnCls =
    variant === "header"
      ? cn(
          "border-border hover:bg-primary hover:text-primary-foreground relative inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-background",
          className,
        )
      : cn(
          "relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5",
          className,
        );

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={btnCls}
        aria-label="اعلان‌ها"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-4 w-4" strokeWidth={1.5} />
        {unread > 0 ? (
          <span className="bg-primary text-primary-foreground absolute -top-0.5 -left-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="border-border bg-card absolute top-full left-0 z-[80] mt-2 w-[min(92vw,22rem)] overflow-hidden rounded-2xl border shadow-xl"
          dir="rtl"
        >
          <div className="border-border flex items-center justify-between gap-2 border-b px-3 py-2.5">
            <span className="text-sm font-bold">اعلان‌ها</span>
            <div className="flex items-center gap-2">
              {unread > 0 ? (
                <button
                  type="button"
                  className="text-primary text-xs hover:underline"
                  onClick={() => void markAll()}
                >
                  خواندن همه
                </button>
              ) : null}
              <Link
                href="/dashboard?tab=notifications"
                className="text-muted-foreground text-xs hover:underline"
                onClick={() => setOpen(false)}
              >
                همه
              </Link>
            </div>
          </div>

          <div className="max-h-[min(60vh,24rem)] overflow-y-auto p-2">
            {loading ? (
              <div className="flex justify-center py-8">
                <LumaSpin />
              </div>
            ) : items.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                اعلانی نیست.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {items.slice(0, 20).map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={cn(
                        "w-full rounded-xl border p-2.5 text-right transition-colors",
                        n.read_at
                          ? "border-transparent opacity-70 hover:bg-muted/50"
                          : "border-border bg-primary/5 hover:bg-primary/10",
                      )}
                      onClick={() => {
                        if (!n.read_at) void markRead(n.id);
                        if (n.link) {
                          window.location.href = n.link;
                          setOpen(false);
                        }
                      }}
                    >
                      <div className="mb-0.5 flex items-start justify-between gap-2">
                        <span className="text-sm font-medium leading-snug">
                          {n.title}
                        </span>
                        <span className="text-muted-foreground shrink-0 text-[10px]">
                          {formatJalaliDate(n.created_at)}
                        </span>
                      </div>
                      {n.body ? (
                        <p className="text-muted-foreground line-clamp-2 text-xs">
                          {n.body}
                        </p>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
