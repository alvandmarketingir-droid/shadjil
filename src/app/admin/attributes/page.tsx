"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  adminListAttributesAction,
  adminCreateAttributeAction,
  adminCreateAttributeOptionAction,
  adminDeleteAttributeOptionAction,
  adminUpdateAttributeOptionAction,
  type AttrWithOptions,
} from "@/app/admin/actions/attributes";
import { LumaSpin } from "@/components/ui/luma-spin";
import { AdminBulkBar } from "@/components/admin/bulk-bar";
import {
  adminArchiveAttributesAction,
  adminHardDeleteAttributesAction,
} from "@/app/admin/actions/lifecycle";

/** مشخصه وضعیت محصول: slug یا نام */
function isColorAttr(slug: string, name?: string) {
  const s = (slug || "").trim().toLowerCase();
  const n = (name || "").trim().toLowerCase();
  if (s === "roast" || s === "colour" || s === "وضعیت محصول") return true;
  if (n === "وضعیت محصول" || n.includes("وضعیت محصول") || n === "roast" || n === "colour")
    return true;
  if (s.includes("roast") || s.includes("colour")) return true;
  return false;
}

function normalizeHex(raw: string): string | null {
  let h = raw.trim();
  if (!h) return null;
  if (!h.startsWith("#")) h = `#${h}`;
  if (/^#[0-9A-Fa-f]{3}$/.test(h)) {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(h)) return null;
  return h.toUpperCase();
}

export default function AdminAttributesPage() {
  const [items, setItems] = useState<AttrWithOptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [optValue, setOptValue] = useState<Record<string, string>>({});
  const [optHex, setOptHex] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }
  function toggleSelectAll(ids: string[]) {
    setSelected((prev) =>
      prev.length === ids.length && ids.every((id) => prev.includes(id))
        ? []
        : [...ids],
    );
  }
  async function runBulkArchive() {
    if (!selected.length) return;
    if (!confirm("آرشیو مشخصه‌های انتخاب‌شده؟ (غیرفعال فیلتر)")) return;
    setBulkBusy(true);
    const res = await adminArchiveAttributesAction(selected);
    setBulkBusy(false);
    if (!res.ok) {
      setError("آرشیو ناموفق");
      return;
    }
    setSelected([]);
    void load();
  }
  async function runBulkHardDelete() {
    if (!selected.length) return;
    if (!confirm("حذف دائمی مشخصه‌ها؟ گزینه‌ها و مقادیر محصولات هم پاک می‌شوند."))
      return;
    setBulkBusy(true);
    const res = await adminHardDeleteAttributesAction(selected);
    setBulkBusy(false);
    if (!res.ok) {
      setError("حذف دائمی ناموفق");
      return;
    }
    setSelected([]);
    void load();
  }
  async function archiveOne(id: string, n: string) {
    if (!confirm(`آرشیو «${n}»؟`)) return;
    setBulkBusy(true);
    const res = await adminArchiveAttributesAction([id]);
    setBulkBusy(false);
    if (!res.ok) {
      setError("آرشیو ناموفق");
      return;
    }
    void load();
  }
  async function hardDeleteOne(id: string, n: string) {
    if (!confirm(`حذف دائمی «${n}»؟`)) return;
    setBulkBusy(true);
    const res = await adminHardDeleteAttributesAction([id]);
    setBulkBusy(false);
    if (!res.ok) {
      setError("حذف دائمی ناموفق");
      return;
    }
    void load();
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminListAttributesAction();
    setLoading(false);
    if (!res.ok) {
      setError(
        res.error === "login_required"
          ? "ورود لازم است"
          : res.error === "forbidden"
            ? "دسترسی ادمین ندارید"
            : "خطا",
      );
      setItems([]);
      return;
    }
    setItems(res.items);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreateAttr(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const res = await adminCreateAttributeAction({ name: name.trim() });
    setCreating(false);
    if (!res.ok) {
      setError("ایجاد مشخصه ناموفق");
      return;
    }
    setName("");
    await load();
  }

  async function onAddOption(attributeId: string, slug: string, attrName: string) {
    const value = (optValue[attributeId] || "").trim();
    if (!value) return;
    const roast = isColorAttr(slug, attrName);
    const hexRaw = (optHex[attributeId] || "").trim();
    const hex = roast ? normalizeHex(hexRaw) : null;
    if (roast && hexRaw && !hex) {
      setError("کد وضعیت محصول معتبر نیست (مثلاً #1A2B3C یا 1A2B3C)");
      return;
    }
    if (roast && !hex) {
      setError("برای وضعیت محصول، کد هگز یا انتخاب از پیکر وضعیت محصول لازم است");
      return;
    }
    setBusy(attributeId);
    setError(null);
    const res = await adminCreateAttributeOptionAction({
      attribute_id: attributeId,
      value,
      hex: roast ? hex : null,
    });
    setBusy(null);
    if (!res.ok) {
      setError("افزودن گزینه ناموفق — ستون hex در دیتابیس را چک کنید");
      return;
    }
    setOptValue((p) => ({ ...p, [attributeId]: "" }));
    setOptHex((p) => ({ ...p, [attributeId]: "" }));
    await load();
  }

  async function onDelOption(id: string) {
    if (!confirm("حذف این گزینه؟")) return;
    setBusy(id);
    const res = await adminDeleteAttributeOptionAction(id);
    setBusy(null);
    if (!res.ok) {
      setError("حذف ناموفق");
      return;
    }
    await load();
  }

  async function onHexBlur(
    optionId: string,
    raw: string,
    current: string | null | undefined,
  ) {
    const hex = normalizeHex(raw);
    if (raw.trim() && !hex) {
      setError("کد وضعیت محصول معتبر نیست (مثلاً #5B8FA8)");
      return;
    }
    if ((hex || null) === (current || null)) return;
    setBusy(optionId);
    setError(null);
    const res = await adminUpdateAttributeOptionAction({
      id: optionId,
      hex,
    });
    setBusy(null);
    if (!res.ok) {
      setError("ذخیره وضعیت محصول ناموفق");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">مشخصات محصول</h1>
          <p className="text-muted-foreground mt-1 text-xs">
            برای مشخصه وضعیت محصول: نام + کد هگز (سواچ)
          </p>
        </div>
        <Link
          href="/admin/products"
          className="text-muted-foreground text-sm hover:underline"
        >
          محصولات
        </Link>
      </div>

      <form
        onSubmit={onCreateAttr}
        className="border-border flex flex-wrap items-end gap-2 rounded-2xl border p-4"
      >
        <label className="block min-w-[12rem] flex-1 space-y-1 text-sm">
          <span>نام مشخصه جدید</span>
          <input
            className="border-border bg-background w-full rounded-xl border px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً جنس"
          />
        </label>
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm disabled:opacity-50"
        >
          {creating ? "…" : "افزودن مشخصه"}
        </button>
      </form>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <AdminBulkBar
        count={selected.length}
        total={items.length}
        onSelectAll={() => toggleSelectAll(items.map((x) => x.id))}
        busy={bulkBusy}
        onArchive={() => void runBulkArchive()}
        onHardDelete={() => void runBulkHardDelete()}
        onClear={() => setSelected([])}
        archiveLabel="آرشیو (غیرفعال فیلتر)"
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <LumaSpin />
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((a) => {
            const roast = isColorAttr(a.slug, a.name);
            return (
              <div
                key={a.id}
                className="border-border space-y-3 rounded-2xl border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold text-primary">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected.includes(a.id)}
                        onChange={() => toggleSelect(a.id)}
                      />
                      <span>{a.name}</span>
                    </label>
                    <button
                      type="button"
                      className="text-muted-foreground mr-2 text-xs"
                      onClick={() => void archiveOne(a.id, a.name)}
                    >
                      آرشیو
                    </button>
                    <button
                      type="button"
                      className="text-destructive text-xs"
                      onClick={() => void hardDeleteOne(a.id, a.name)}
                    >
                      حذف دائمی
                    </button>
                  </h2>
                  <span className="text-muted-foreground font-mono text-xs">
                    {a.slug}
                    {roast ? " · وضعیت محصول + هگز" : ""}
                  </span>
                </div>

                <ul className="flex flex-wrap gap-2">
                  {a.options.map((o) => {
                    const hx = (o as { hex?: string | null }).hex || null;
                    return (
                      <li
                        key={o.id}
                        className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm"
                      >
                        {roast ? (
                          <span
                            className="border-border inline-block h-6 w-6 shrink-0 rounded-full border shadow-sm"
                            style={{ backgroundColor: hx || "#ccc" }}
                            title={hx || "بدون hex"}
                          />
                        ) : null}
                        <span>{o.value}</span>
                        {roast ? (
                          <>
                            <input
                              type="roast"
                              className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                              value={normalizeHex(hx || "") || "#CCCCCC"}
                              onChange={(e) => {
                                const v = e.target.value.toUpperCase();
                                void onHexBlur(o.id, v, hx);
                              }}
                              title="انتخاب وضعیت محصول"
                            />
                            <input
                              className="border-border bg-background w-[7.5rem] rounded border px-1.5 py-0.5 font-mono text-xs"
                              defaultValue={hx || ""}
                              placeholder="#RRGGBB"
                              onBlur={(e) =>
                                void onHexBlur(o.id, e.target.value, hx)
                              }
                            />
                          </>
                        ) : null}
                        <button
                          type="button"
                          className="text-destructive text-xs hover:underline"
                          disabled={busy === o.id}
                          onClick={() => void onDelOption(o.id)}
                        >
                          ×
                        </button>
                      </li>
                    );
                  })}
                  {!a.options.length ? (
                    <li className="text-muted-foreground text-xs">
                      گزینه‌ای نیست
                    </li>
                  ) : null}
                </ul>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    className="border-border bg-background max-w-xs flex-1 rounded-lg border px-2 py-1.5 text-sm"
                    placeholder={roast ? "نام وضعیت محصول (مثلاً آبی)" : "گزینه جدید"}
                    value={optValue[a.id] ?? ""}
                    onChange={(e) =>
                      setOptValue((p) => ({
                        ...p,
                        [a.id]: e.target.value,
                      }))
                    }
                  />
                  {roast ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="roast"
                        className="border-border h-9 w-10 cursor-pointer rounded-lg border bg-transparent p-0.5"
                        value={normalizeHex(optHex[a.id] || "") || "#5B8FA8"}
                        onChange={(e) =>
                          setOptHex((p) => ({
                            ...p,
                            [a.id]: e.target.value.toUpperCase(),
                          }))
                        }
                        title="انتخاب وضعیت محصول"
                      />
                      <input
                        className="border-border bg-background w-[8rem] rounded-lg border px-2 py-1.5 font-mono text-sm"
                        placeholder="#5B8FA8"
                        value={optHex[a.id] ?? ""}
                        onChange={(e) =>
                          setOptHex((p) => ({
                            ...p,
                            [a.id]: e.target.value,
                          }))
                        }
                      />
                      <span
                        className="border-border inline-block h-8 w-8 shrink-0 rounded-full border shadow-sm"
                        style={{
                          backgroundColor:
                            normalizeHex(optHex[a.id] || "") || "#e5e7eb",
                        }}
                        title="پیش‌نمایش سواچ"
                      />
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="border-border rounded-lg border px-3 py-1.5 text-xs"
                    disabled={busy === a.id}
                    onClick={() => void onAddOption(a.id, a.slug, a.name)}
                  >
                    + گزینه
                  </button>
                </div>
                {roast ? (
                  <p className="text-muted-foreground text-[11px]">
                    نام وضعیت محصول + کد هگز (یا از دایره وضعیت محصول انتخاب کنید) → سواچ در فیلتر و محصول
                  </p>
                ) : null}
              </div>
            );
          })}
          {!items.length ? (
            <p className="text-muted-foreground text-center text-sm">
              مشخصه‌ای نیست — از فرم بالا اضافه کنید یا SQL seed را اجرا کنید.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
