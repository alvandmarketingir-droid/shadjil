"use client";

import { useEffect, useState } from "react";
import {
  getFreeShippingSettingsAction,
  saveFreeShippingSettingsAction,
} from "./free-shipping-actions";
import { toPersianDigits } from "@/lib/numbers";

export function FreeShippingForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [minAmount, setMinAmount] = useState("2000000");
  const [excludeCodes, setExcludeCodes] = useState("peyk,alopeyk");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await getFreeShippingSettingsAction();
      setLoading(false);
      if (!res.ok) {
        setErr(
          res.error === "forbidden"
            ? "دسترسی ادمین ندارید"
            : res.error === "login_required"
              ? "وارد شوید"
              : "خواندن تنظیمات ناموفق بود",
        );
        return;
      }
      setEnabled(res.enabled);
      setMinAmount(String(res.minAmount || 0));
      setExcludeCodes(res.excludeCodes || "");
    })();
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setSaving(true);
    const res = await saveFreeShippingSettingsAction({
      enabled,
      minAmount: Number(minAmount.replace(/[^\d]/g, "")) || 0,
      excludeCodes,
    });
    setSaving(false);
    if (!res.ok) {
      setErr("ذخیره ناموفق بود");
      return;
    }
    setMsg("تنظیمات ارسال رایگان ذخیره شد");
  }

  if (loading) {
    return (
      <div className="border-border text-muted-foreground rounded-xl border p-4 text-sm">
        در حال بارگذاری تنظیمات ارسال رایگان…
      </div>
    );
  }

  return (
    <form
      onSubmit={onSave}
      className="border-border space-y-4 rounded-xl border p-4"
      dir="rtl"
    >
      <div>
        <h2 className="font-semibold">ارسال رایگان</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          اگر مبلغ سبد (بعد از تخفیف) به آستانه برسد، هزینه ارسال صفر می‌شود.
        </p>
      </div>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="size-4"
        />
        <span>فعال بودن ارسال رایگان</span>
      </label>

      <label className="block space-y-1 text-sm">
        <span>آستانه مبلغ سفارش (تومان)</span>
        <input
          type="text"
          inputMode="numeric"
          value={minAmount}
          onChange={(e) => setMinAmount(e.target.value.replace(/[^\d]/g, ""))}
          className="border-input bg-background h-10 w-full max-w-xs rounded-xl border px-3"
          dir="ltr"
        />
        <span className="text-muted-foreground text-xs">
          مثال: {toPersianDigits("2000000")} تومان
        </span>
      </label>

      <label className="block space-y-1 text-sm">
        <span>کد روش‌های مستثنی (با ویرگول)</span>
        <input
          type="text"
          value={excludeCodes}
          onChange={(e) => setExcludeCodes(e.target.value)}
          className="border-input bg-background h-10 w-full max-w-md rounded-xl border px-3"
          dir="ltr"
          placeholder="peyk,alopeyk"
        />
        <span className="text-muted-foreground text-xs">
          این روش‌ها حتی با رسیدن به آستانه هم رایگان نمی‌شوند (مثلاً پیک)
        </span>
      </label>

      {err ? <p className="text-destructive text-sm">{err}</p> : null}
      {msg ? <p className="text-sm text-emerald-600">{msg}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="bg-primary text-primary-foreground h-10 rounded-xl px-4 text-sm font-medium disabled:opacity-50"
      >
        {saving ? "در حال ذخیره…" : "ذخیره تنظیمات"}
      </button>
    </form>
  );
}
