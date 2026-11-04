import { requireAdmin } from "@/lib/admin/require-admin";
import { toPersianDigits } from "@/lib/numbers";
import { ShippingActions } from "./actions-client";
import { FreeShippingForm } from "./free-shipping-form";
import { ShippingZonesForm } from "./zones-form";

export const dynamic = "force-dynamic";

export default async function ShippingAdminPage() {
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
    .from("shipping_methods")
    .select(
      "id, title, description, fee, is_active, sort_order, provider_code, pricing_type, api_config"
    )
    .order("sort_order", { ascending: true });

  if (error) {
    return (
      <div className="p-6 text-sm text-destructive" dir="rtl">
        خطا در بارگذاری روش‌های ارسال: {error.message}
      </div>
    );
  }

  const rows = data ?? [];

  const pricingLabel: Record<string, string> = {
    fixed: "ثابت",
    api: "استعلام API",
    negotiable: "توافقی",
  };

  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl">
      <div>
        <h1 className="text-xl font-bold">روش‌های ارسال</h1>
        <p className="text-muted-foreground text-sm">
          افزودن، ویرایش، فعال/غیرفعال و تنظیم API روش‌های ارسال
        </p>
      </div>

      <div className="border-border overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="p-3 text-right font-medium">ترتیب</th>
              <th className="p-3 text-right font-medium">عنوان</th>
              <th className="p-3 text-right font-medium">نوع قیمت</th>
              <th className="p-3 text-right font-medium">هزینه (تومان)</th>
              <th className="p-3 text-right font-medium">وضعیت</th>
              <th className="p-3 text-right font-medium">عملیات / API</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted-foreground p-6 text-center">
                  هنوز روش ارسالی تعریف نشده است.
                </td>
              </tr>
            ) : (
              rows.map((r: any) => (
                <tr key={r.id} className="border-border border-t align-top">
                  <td className="p-3 text-xs">
                    {toPersianDigits(String(r.sort_order))}
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{r.title}</div>
                    <div className="text-muted-foreground mt-0.5 text-xs">
                      {r.description || "—"}
                    </div>
                    {r.provider_code ? (
                      <div className="text-muted-foreground mt-1 text-[10px]">
                        کد: {r.provider_code}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-3 text-xs">
                    {pricingLabel[r.pricing_type] || r.pricing_type}
                  </td>
                  <td className="p-3">
                    {r.pricing_type === "negotiable"
                      ? "توافقی"
                      : r.pricing_type === "api"
                        ? "از API"
                        : r.fee === 0
                          ? "رایگان"
                          : toPersianDigits(r.fee.toLocaleString("fa-IR"))}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        r.is_active
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.is_active ? "فعال" : "غیرفعال"}
                    </span>
                  </td>
                  <td className="p-3">
                    <ShippingActions
                      id={r.id}
                      title={r.title}
                      description={r.description ?? ""}
                      fee={r.fee}
                      isActive={r.is_active}
                      sortOrder={r.sort_order}
                      providerCode={r.provider_code ?? ""}
                      pricingType={r.pricing_type ?? "fixed"}
                      apiConfig={r.api_config ?? {}}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-border rounded-xl border p-4">
        <h2 className="mb-3 font-semibold">افزودن روش جدید</h2>
        <ShippingActions mode="create" />
      </div>

      <ShippingZonesForm />

      <FreeShippingForm />
    </div>
  );
}
