import { requireAdmin } from "@/lib/admin/require-admin";
import { formatJalaliDateTime } from "@/lib/dates/jalali";
import { toPersianDigits } from "@/lib/numbers";
import { ContactMessageActions } from "./actions-client";
import { ContactMessagesRealtimeRefresh } from "./realtime-refresh";

export const dynamic = "force-dynamic";

export default async function ContactMessagesAdminPage() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return (
      <div className="p-6 text-sm text-destructive" dir="rtl">
        دسترسی غیرمجاز
      </div>
    );
  }
  const supabase = gate.supabase;
  const { data, error } = await supabase
    .from("contact_messages")
    .select("id, created_at, name, company, email, message, status, admin_note")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <>
        <ContactMessagesRealtimeRefresh />
        <div className="p-6 text-sm text-destructive" dir="rtl">
          خطا در بارگذاری پیام‌ها: {error.message}
          <p className="text-muted-foreground mt-2 text-xs">
            اگر جدول نیست، migration 028_contact_messages را در Supabase اجرا کنید.
          </p>
        </div>
      </>
    );
  }

  const rows = data ?? [];
  const counts = {
    all: rows.length,
    new: rows.filter((r) => r.status === "new").length,
    read: rows.filter((r) => r.status === "read").length,
    replied: rows.filter((r) => r.status === "replied").length,
  };

  return (
    <>
      <ContactMessagesRealtimeRefresh />
      <div className="space-y-6 p-4 md:p-6" dir="rtl">
        <div>
          <h1 className="text-xl font-bold">پیام‌های تماس با ما</h1>
          <p className="text-muted-foreground text-sm">گزارش پیام‌های فرم صفحه تماس</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["همه", counts.all],
              ["جدید", counts.new],
              ["خوانده‌شده", counts.read],
              ["پاسخ‌داده‌شده", counts.replied],
            ] as const
          ).map(([label, n]) => (
            <div key={label} className="border-border bg-card rounded-xl border p-3">
              <p className="text-muted-foreground text-xs">{label}</p>
              <p className="text-lg font-semibold">{toPersianDigits(String(n))}</p>
            </div>
          ))}
        </div>
        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-3 text-right font-medium">زمان</th>
                <th className="p-3 text-right font-medium">نام</th>
                <th className="p-3 text-right font-medium">ایمیل</th>
                <th className="p-3 text-right font-medium">پیام</th>
                <th className="p-3 text-right font-medium">وضعیت</th>
                <th className="p-3 text-right font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-muted-foreground p-6 text-center">
                    هنوز پیامی ثبت نشده است.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-border border-t align-top">
                    <td className="p-3 whitespace-nowrap text-xs">{formatJalaliDateTime(r.created_at)}</td>
                    <td className="p-3">
                      <div className="font-medium">{r.name}</div>
                      {r.company ? <div className="text-muted-foreground text-xs">{r.company}</div> : null}
                    </td>
                    <td className="p-3" dir="ltr">
                      <a className="text-secondary underline" href={`mailto:${r.email}`}>{r.email}</a>
                    </td>
                    <td className="max-w-xs p-3">
                      <p className="line-clamp-4 whitespace-pre-wrap">{r.message}</p>
                    </td>
                    <td className="p-3">
                      <span className="bg-secondary/10 text-secondary rounded-full px-2 py-0.5 text-xs">
                        {r.status === "new" ? "جدید" : r.status === "read" ? "خوانده" : r.status === "replied" ? "پاسخ" : "آرشیو"}
                      </span>
                    </td>
                    <td className="p-3">
                      <ContactMessageActions id={r.id} status={r.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
