import { requireAdmin } from "@/lib/admin/require-admin";
import { formatJalaliDateTime } from "@/lib/dates/jalali";
import { toPersianDigits } from "@/lib/numbers";
import { ReviewActions } from "./actions-client";
import { ReviewsRealtimeRefresh } from "./realtime-refresh";

export const dynamic = "force-dynamic";

export default async function ReviewsAdminPage() {
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
    .from("reviews")
    .select(
      "id, created_at, rating, title, body, is_approved, is_verified, admin_reply, product_id, user_id, user:profiles(full_name), product:products(name, slug)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <>
        <ReviewsRealtimeRefresh />
        <div className="p-6 text-sm text-destructive" dir="rtl">
          خطا در بارگذاری نظرات: {error.message}
        </div>
      </>
    );
  }

  const rows = data ?? [];
  const counts = {
    all: rows.length,
    pending: rows.filter((r) => !r.is_approved).length,
    approved: rows.filter((r) => r.is_approved).length,
  };

  return (
    <>
      <ReviewsRealtimeRefresh />
      <div className="space-y-6 p-4 md:p-6" dir="rtl">
        <div>
          <h1 className="text-xl font-bold">نظرات محصولات</h1>
          <p className="text-muted-foreground text-sm">
            تأیید، رد و پاسخ به نظرات خریداران
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(
            [
              ["همه", counts.all],
              ["در انتظار تأیید", counts.pending],
              ["تأیید شده", counts.approved],
            ] as const
          ).map(([label, n]) => (
            <div key={label} className="border-border bg-card rounded-xl border p-3">
              <p className="text-muted-foreground text-xs">{label}</p>
              <p className="text-lg font-semibold">{toPersianDigits(String(n))}</p>
            </div>
          ))}
        </div>

        <div className="border-border overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-3 text-right font-medium">زمان</th>
                <th className="p-3 text-right font-medium">محصول</th>
                <th className="p-3 text-right font-medium">کاربر</th>
                <th className="p-3 text-right font-medium">امتیاز</th>
                <th className="p-3 text-right font-medium">نظر</th>
                <th className="p-3 text-right font-medium">وضعیت</th>
                <th className="p-3 text-right font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted-foreground p-6 text-center">
                    هنوز نظری ثبت نشده است.
                  </td>
                </tr>
              ) : (
                rows.map((r: any) => (
                  <tr key={r.id} className="border-border border-t align-top">
                    <td className="p-3 whitespace-nowrap text-xs">
                      {formatJalaliDateTime(r.created_at)}
                    </td>
                    <td className="p-3">
                      <div className="font-medium">
                        {r.product?.name ?? "—"}
                      </div>
                      {r.product?.slug ? (
                        <a
                          href={`/products/${r.product.slug}`}
                          target="_blank"
                          className="text-muted-foreground text-xs hover:underline"
                        >
                          مشاهده محصول
                        </a>
                      ) : null}
                    </td>
                    <td className="p-3">
                      <div className="font-medium">
                        {r.user?.full_name?.trim() || "کاربر"}
                      </div>
                      {r.is_verified ? (
                        <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 mt-1 inline-block rounded px-1.5 py-0.5 text-[10px]">
                          خریدار تأییدشده
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3 text-amber-600">
                      {"★".repeat(r.rating || 0)}
                    </td>
                    <td className="max-w-xs p-3">
                      {r.title ? (
                        <p className="mb-1 font-medium">{r.title}</p>
                      ) : null}
                      <p className="text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                        {r.body}
                      </p>
                      {r.admin_reply ? (
                        <div className="bg-muted/50 mt-2 rounded-lg border-r-2 border-primary p-2 text-xs">
                          <p className="mb-0.5 font-medium text-primary">پاسخ فروشگاه</p>
                          <p className="text-muted-foreground whitespace-pre-wrap">
                            {r.admin_reply}
                          </p>
                        </div>
                      ) : null}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          r.is_approved
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        }`}
                      >
                        {r.is_approved ? "تأیید شده" : "در انتظار"}
                      </span>
                    </td>
                    <td className="p-3">
                      <ReviewActions
                        id={r.id}
                        isApproved={!!r.is_approved}
                        adminReply={r.admin_reply ?? ""}
                      />
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
