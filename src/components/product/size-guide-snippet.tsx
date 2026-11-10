import Link from "next/link";
import type { SizeGuideView } from "@/lib/size-guide/load";
import { formatCm } from "@/lib/size-guide/load";

export function SizeGuideSnippet({ guide }: { guide: SizeGuideView | null }) {
  if (!guide?.rows?.length) {
    return (
      <p className="text-muted-foreground text-xs">
        <Link
          href="/size-guide"
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          راهنمای بسته‌بندی کامل
        </Link>
      </p>
    );
  }

  const rows = guide.rows;
  const showChest = rows.some((r) => r.chest_cm != null);
  const showNeck = rows.some((r) => r.neck_cm != null);
  const showSleeve = rows.some((r) => r.sleeve_cm != null);

  return (
    <div className="border-border space-y-2 rounded-xl border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">جدول بسته‌بندی</p>
        <Link
          href="/size-guide"
          className="text-primary text-xs font-medium underline-offset-4 hover:underline"
        >
          راهنمای کامل
        </Link>
      </div>
      <div className="table-scroll overflow-x-auto">
        <table className="w-full min-w-[16rem] text-center text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-1.5 font-medium">وزن/بسته</th>
              {showChest ? <th className="p-1.5 font-medium">سینه</th> : null}
              {showNeck ? <th className="p-1.5 font-medium">گردن</th> : null}
              {showSleeve ? <th className="p-1.5 font-medium">آستین</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.weight_label} className="border-border border-t">
                <td className="p-1.5 font-medium">{row.weight_label}</td>
                {showChest ? (
                  <td className="p-1.5 tabular-nums">{formatCm(row.chest_cm)}</td>
                ) : null}
                {showNeck ? (
                  <td className="p-1.5 tabular-nums">{formatCm(row.neck_cm)}</td>
                ) : null}
                {showSleeve ? (
                  <td className="p-1.5 tabular-nums">{formatCm(row.sleeve_cm)}</td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground text-[10px] leading-relaxed">
        اعداد به سانتی‌متر — تقریبی؛ در صورت تردید با پشتیبانی هماهنگ کنید.
      </p>
    </div>
  );
}
