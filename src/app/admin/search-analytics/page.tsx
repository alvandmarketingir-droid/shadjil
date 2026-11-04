import { requireAdmin } from "@/lib/admin/require-admin";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SearchAnalyticsPage() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return (
      <div className="p-6 text-sm text-destructive" dir="rtl">
        دسترسی غیرمجاز
      </div>
    );
  }
  const { data: rows } = await gate.supabase
    .from("search_queries")
    .select("query, result_count, source, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const counts = new Map<string, { n: number; zero: number }>();
  for (const r of rows ?? []) {
    const q = String((r as { query: string }).query || "").trim();
    if (!q) continue;
    const cur = counts.get(q) ?? { n: 0, zero: 0 };
    cur.n += 1;
    if (Number((r as { result_count: number }).result_count) === 0) cur.zero += 1;
    counts.set(q, cur);
  }
  const top = [...counts.entries()]
    .map(([query, v]) => ({ query, ...v }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 40);

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">آمار جستجو</h1>
        <Link href="/admin" className="text-muted-foreground text-sm underline">
          بازگشت
        </Link>
      </div>
      <p className="text-muted-foreground text-sm">
        ۲۰۰ لاگ اخیر · پرتکرارترین عبارت‌ها و جستجوهای بدون نتیجه
      </p>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-right">
            <tr>
              <th className="p-3">عبارت</th>
              <th className="p-3">تعداد</th>
              <th className="p-3">بدون نتیجه</th>
            </tr>
          </thead>
          <tbody>
            {top.map((r) => (
              <tr key={r.query} className="border-t">
                <td className="p-3 font-medium">{r.query}</td>
                <td className="p-3">{r.n}</td>
                <td className="p-3">{r.zero}</td>
              </tr>
            ))}
            {!top.length ? (
              <tr>
                <td colSpan={3} className="text-muted-foreground p-6 text-center">
                  هنوز لاگی ثبت نشده
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
