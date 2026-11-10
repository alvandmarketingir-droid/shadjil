"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  adminDeleteRedirectAction,
  adminListRedirectsAction,
  adminToggleRedirectAction,
  adminUpsertRedirectAction,
  type UrlRedirectRow,
} from "@/app/admin/actions/redirects";
import { LumaSpin } from "@/components/ui/luma-spin";

export default function AdminRedirectsPage() {
  const [items, setItems] = useState<UrlRedirectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [fromPath, setFromPath] = useState("");
  const [toPath, setToPath] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminListRedirectsAction();
    setItems(res.ok ? res.items : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAdd() {
    setBusy(true);
    setMsg("");
    const res = await adminUpsertRedirectAction({
      fromPath,
      toPath,
      statusCode: 301,
      note,
    });
    setBusy(false);
    if (!res.ok) {
      const map: Record<string, string> = {
        path_invalid: "مسیر نامعتبر است (باید با / شروع شود).",
        same_path: "مبدأ و مقصد نباید یکی باشند.",
        server: "خطای سرور",
      };
      setMsg(map[res.error] || "خطا");
      return;
    }
    setFromPath("");
    setToPath("");
    setNote("");
    setMsg("ذخیره شد");
    await load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-primary text-2xl font-bold">ریدایرکت‌ها (۳۰۱)</h1>
          <p className="text-muted-foreground text-sm">
            آدرس قدیمی → آدرس جدید. برای سئو و لینک‌های شکسته.
          </p>
        </div>
        <Link href="/admin/seo" className="text-primary text-sm underline">
          سئو PLP
        </Link>
      </div>

      <div className="border-border bg-card space-y-3 rounded-2xl border p-4">
        <h2 className="font-semibold">افزودن / به‌روزرسانی</h2>
        <label className="block space-y-1 text-sm">
          <span>از مسیر (مثال: /products/old-slug)</span>
          <input
            className="border-input bg-background w-full rounded-lg border px-3 py-2 font-mono text-sm"
            value={fromPath}
            onChange={(e) => setFromPath(e.target.value)}
            placeholder="/products/old-name"
            dir="ltr"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>به مسیر (مثال: /products/new-slug)</span>
          <input
            className="border-input bg-background w-full rounded-lg border px-3 py-2 font-mono text-sm"
            value={toPath}
            onChange={(e) => setToPath(e.target.value)}
            placeholder="/products/new-name"
            dir="ltr"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>یادداشت (اختیاری)</span>
          <input
            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        {msg ? <p className="text-sm">{msg}</p> : null}
        <button
          type="button"
          disabled={busy || !fromPath.trim() || !toPath.trim()}
          onClick={() => void onAdd()}
          className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm disabled:opacity-50"
        >
          {busy ? "…" : "ذخیره ۳۰۱"}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LumaSpin />
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">هنوز ریدایرکتی ثبت نشده.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-right">
                <th className="p-3">از</th>
                <th className="p-3">به</th>
                <th className="p-3">کد</th>
                <th className="p-3">منبع</th>
                <th className="p-3">فعال</th>
                <th className="p-3">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-mono text-xs" dir="ltr">
                    {r.from_path}
                  </td>
                  <td className="p-3 font-mono text-xs" dir="ltr">
                    {r.to_path}
                  </td>
                  <td className="p-3">{r.status_code}</td>
                  <td className="p-3 text-xs">{r.source}</td>
                  <td className="p-3">{r.is_active ? "بله" : "خیر"}</td>
                  <td className="space-x-2 space-x-reverse p-3">
                    <button
                      type="button"
                      className="text-primary text-xs underline"
                      onClick={() =>
                        void adminToggleRedirectAction(r.id, !r.is_active).then(load)
                      }
                    >
                      {r.is_active ? "غیرفعال" : "فعال"}
                    </button>
                    <button
                      type="button"
                      className="text-destructive text-xs underline"
                      onClick={() =>
                        void adminDeleteRedirectAction(r.id).then(load)
                      }
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
