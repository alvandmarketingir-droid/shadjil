import type { Metadata } from "next";

export const revalidate = 60;
import { StaticPage } from "@/components/content/static-page";
import { formatCm, loadPrimarySizeGuide } from "@/lib/weight-guide/load";

export const metadata: Metadata = {
  title: "راهنمای بسته‌بندی | شادجیل",
  description: "راهنمای انتخاب وزن بسته آجیل، خشکبار و خرما در شادجیل",
};

const FALLBACK = [
  { weight_label: "۲۵۰ گرم", note: "مناسب مصرف کوتاه‌مدت یا هدیه کوچک" },
  { weight_label: "۵۰۰ گرم", note: "پرمصرف‌ترین بسته خانگی" },
  { weight_label: "۱ کیلوگرم", note: "اقتصادی برای مصرف بیشتر" },
] as const;

export default async function SizeGuidePage() {
  const guide = await loadPrimarySizeGuide();
  const rows = guide && guide.rows.length ? guide.rows : null;

  const showWaist = rows?.some((r) => r.waist_cm != null) ?? false;
  const showShoulder = rows?.some((r) => r.shoulder_cm != null) ?? false;
  const showLength = rows?.some((r) => r.length_cm != null) ?? false;
  const showSleeve = rows?.some((r) => r.sleeve_cm != null) ?? false;
  const showNeck = rows?.some((r) => r.neck_cm != null) ?? false;
  const showChest = rows?.some((r) => r.chest_cm != null) ?? false;
  const hasBodyMeasures =
    showChest || showWaist || showShoulder || showNeck || showSleeve || showLength;

  return (
    <StaticPage title={guide?.name || "راهنمای بسته‌بندی"}>
      <p>
        {guide?.description?.trim() ||
          "وزن بسته‌ها روی صفحه هر محصول مشخص است. اگر بین دو وزن مردد هستید، معمولاً بسته بزرگ‌تر برای مصرف بیشتر به‌صرفه‌تر است؛ جزئیات همان کالا اولویت دارد."}
      </p>
      {rows && hasBodyMeasures ? (
        <div className="table-scroll border-border overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[28rem] text-center text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2">وزن / بسته</th>
                {showChest ? <th className="p-2">سینه (cm)</th> : null}
                {showWaist ? <th className="p-2">کمر (cm)</th> : null}
                {showShoulder ? <th className="p-2">شانه (cm)</th> : null}
                {showNeck ? <th className="p-2">گردن (cm)</th> : null}
                {showSleeve ? <th className="p-2">آستین (cm)</th> : null}
                {showLength ? <th className="p-2">قد (cm)</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.weight_label} className="border-border border-t">
                  <td className="p-2 font-medium">{row.weight_label}</td>
                  {showChest ? (
                    <td className="p-2 tabular-nums">{formatCm(row.chest_cm)}</td>
                  ) : null}
                  {showWaist ? (
                    <td className="p-2 tabular-nums">{formatCm(row.waist_cm)}</td>
                  ) : null}
                  {showShoulder ? (
                    <td className="p-2 tabular-nums">{formatCm(row.shoulder_cm)}</td>
                  ) : null}
                  {showNeck ? (
                    <td className="p-2 tabular-nums">{formatCm(row.neck_cm)}</td>
                  ) : null}
                  {showSleeve ? (
                    <td className="p-2 tabular-nums">{formatCm(row.sleeve_cm)}</td>
                  ) : null}
                  {showLength ? (
                    <td className="p-2 tabular-nums">{formatCm(row.length_cm)}</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-scroll border-border overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[20rem] text-center text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2">وزن بسته</th>
                <th className="p-2">توضیح</th>
              </tr>
            </thead>
            <tbody>
              {(rows?.length
                ? rows.map((r) => ({
                    weight_label: r.weight_label,
                    note: "طبق راهنمای ثبت‌شده در فروشگاه",
                  }))
                : FALLBACK
              ).map((row) => (
                <tr key={row.weight_label} className="border-border border-t">
                  <td className="p-2 font-medium">{row.weight_label}</td>
                  <td className="text-muted-foreground p-2">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </StaticPage>
  );
}
