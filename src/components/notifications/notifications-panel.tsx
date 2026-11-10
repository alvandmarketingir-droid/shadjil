"use client";

import { useNotifications } from "@/lib/notifications/use-notifications";
import { LumaSpin } from "@/components/ui/luma-spin";
import { cn } from "@/lib/utils";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/dates/jalali";


export function NotificationsPanel({ onNavigate }: { onNavigate?: () => void }) {
  const { items, loading, unread, markRead, markAll } = useNotifications(true);

  return (
    <div className="flex h-full flex-col" dir="rtl">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">
          {unread > 0 ? `${unread} خوانده‌نشده` : "همه اعلان‌ها خوانده شده‌اند"}
        </p>
        {unread > 0 ? (
          <button
            type="button"
            className="text-primary text-xs hover:underline"
            onClick={() => void markAll()}
          >
            خواندن همه
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <LumaSpin />
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">اعلانی نیست.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={cn(
                    "w-full rounded-xl border p-3 text-right transition-roasts",
                    n.read_at
                      ? "border-transparent opacity-70 hover:bg-muted/50"
                      : "border-border bg-primary/5 hover:bg-primary/10",
                  )}
                  onClick={() => {
                    if (!n.read_at) void markRead(n.id);
                    if (n.link) {
                      onNavigate?.();
                      window.location.href = n.link;
                    }
                  }}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">{n.title}</span>
                    <span className="text-muted-foreground shrink-0 text-[10px]">
                      {formatJalaliDate(n.created_at)}
                    </span>
                  </div>
                  {n.body ? (
                    <p className="text-muted-foreground line-clamp-2 text-xs">{n.body}</p>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
