"use client";

import { useRtEvent } from "@/hooks/use-rt-event";
import { RT } from "@/lib/realtime/events";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminBulkBar } from "@/components/admin/bulk-bar";
import {
  adminArchiveMediaAction,
  adminHardDeleteMediaAction,
} from "@/app/admin/actions/lifecycle";
import {
  adminListProductImagesAction,
  adminUploadProductImageAction,
  adminUpdateProductImageMetaAction,
  adminDeleteProductImageAction,
  type MediaListItem,
} from "@/app/admin/actions/media";
import { LumaSpin } from "@/components/ui/luma-spin";

export default function AdminMediaPage() {
  const [items, setItems] = useState<MediaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [lastUploadUrl, setLastUploadUrl] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftAlt, setDraftAlt] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminListProductImagesAction(80);
    setLoading(false);
    if (!res.ok) {
      setError(
        res.error === "login_required"
          ? "ورود لازم است"
          : res.error === "forbidden"
            ? "دسترسی ادمین ندارید"
            : "بارگذاری فهرست ناموفق بود",
      );
      setItems([]);
      return;
    }
    setItems(res.items);
    const alts: Record<string, string> = {};
    const names: Record<string, string> = {};
    for (const it of res.items) {
      alts[it.id] = it.alt_text ?? "";
      try {
        const file = (it.url || "").split("/").pop() || "";
        const m = file.match(/^(.+)-(thumb|small|medium|large)\.webp$/i);
        names[it.id] = m ? m[1] : file.replace(/\.webp$/i, "");
      } catch {
        names[it.id] = "";
      }
    }
    setDraftAlt(alts);
    void names;
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useRtEvent(RT.catalog, () => {
    void load();
  });

  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }
  function toggleSelectAll(ids: string[]) {
    setSelected((prev) => (prev.length === ids.length ? [] : ids));
  }

  async function copyUrl(id: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
    } catch {
      setError("کپی لینک ناموفق");
    }
  }

  async function runBulkArchive() {
    if (!selected.length) return;
    if (!confirm("حذف موارد انتخاب‌شده از کتابخانه؟")) return;
    setBulkBusy(true);
    setError(null);
    const res = await adminArchiveMediaAction(selected);
    setBulkBusy(false);
    if (!res.ok) {
      setError("حذف گروهی ناموفق");
      return;
    }
    setSelected([]);
    setMsg("حذف شد");
    void load();
  }

  async function runBulkHardDelete() {
    if (!selected.length) return;
    if (!confirm("حذف دائمی موارد انتخاب‌شده؟ برگشت‌ناپذیر است.")) return;
    setBulkBusy(true);
    setError(null);
    const res = await adminHardDeleteMediaAction(selected);
    setBulkBusy(false);
    if (!res.ok) {
      setError("حذف دائمی ناموفق");
      return;
    }
    setSelected([]);
    setMsg("حذف دائمی انجام شد");
    void load();
  }

  async function deleteOne(item: MediaListItem) {
    if (!confirm("حذف این تصویر؟")) return;
    setBulkBusy(true);
    setError(null);
    const res = await adminDeleteProductImageAction({
      url: item.url,
      imageId: item.id,
    });
    setBulkBusy(false);
    if (!res.ok) {
      setError("حذف ناموفق");
      return;
    }
    setSelected((prev) => prev.filter((x) => x !== item.id));
    void load();
  }

  async function saveMeta(id: string) {

    setSavingId(id);
    setError(null);
    const res = await adminUpdateProductImageMetaAction({
      id,
      alt_text: draftAlt[id] ?? "",
    });
    setSavingId(null);
    if (!res.ok) {
      setError("ذخیره نام/آلت ناموفق");
      return;
    }
    setMsg("ذخیره شد");
    setItems((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, alt_text: (draftAlt[id] || "").trim() || null } : x,
      ),
    );
  }

  async function onUpload(files: FileList | File[] | null) {
    if (!files || (Array.isArray(files) ? files.length === 0 : files.length === 0)) return;
    const list = Array.from(files as FileList | File[]);
    setUploading(true);
    setMsg(null);
    setError(null);
    let ok = 0;
    const errs: string[] = [];
    for (const file of list) {
      const fd = new FormData();
      fd.set("file", file);
      const res = await adminUploadProductImageAction(fd);
      if (!res.ok) {
        errs.push(
          file.name +
            ":" +
            (res.error === "too_large"
              ? "حداکثر ۱۲ مگابایت"
              : res.error === "not_image"
                ? "فقط تصویر"
                : "ناموفق"),
        );
        continue;
      }
      ok += 1;
      if ("url" in res && res.url) setLastUploadUrl(res.url as string);
      // فوری به لیست اضافه کن — بدون ریلود
      const url = String((res as { url?: string }).url || "");
      const imageId = (res as { imageId?: string }).imageId;
      if (url) {
        const row = {
          id: imageId || `tmp-${Date.now()}-${ok}`,
          url,
          alt_text: file.name?.slice(0, 120) || null,
          is_primary: false,
          sort_order: 0,
          product_id: null as string | null,
          product_title: null as string | null,
        };
        setItems((prev) => [row, ...prev.filter((x) => x.url !== url)]);
        setDraftAlt((prev) => ({ ...prev, [row.id]: row.alt_text ?? "" }));
      }
      if ("warning" in res && res.warning === "db_insert_failed") {
        errs.push(file.name + ":db");
      }
    }
    setUploading(false);
    if (ok) setMsg(ok + " تصویر آپلود شد");
    if (errs.length) setError(errs.slice(0, 3).join(" | "));
  }

  return (
    <div className="bg-background min-h-screen space-y-6 p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">رسانه</h1>
          </div>
        <Link href="/admin" className="text-sm text-primary underline-offset-4 hover:underline">
          بازگشت به داشبورد
        </Link>
      </div>

      {msg ? <p className="text-sm text-green-700">{msg}</p> : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      <div className="border-border bg-card max-w-xl space-y-3 rounded-xl border p-4">
        <label className="block text-sm font-medium">آپلود تصویر</label>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploading}
          className="w-auto max-w-full cursor-pointer rounded-lg border-2 border-primary/70 bg-background px-2 py-1.5 text-sm file:me-2 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:border-primary"
          onChange={(e) => {
            void onUpload(e.target.files);
            e.target.value = "";
          }}
        />
        <p className="text-muted-foreground text-xs">می‌توانید چند تصویر را یکجا انتخاب کنید.</p>
        {uploading ? <LumaSpin className="h-6 w-6" /> : null}
        {lastUploadUrl ? (
          <p className="text-muted-foreground break-all text-xs" dir="ltr">
            {lastUploadUrl}
          </p>
        ) : null}
      </div>

      <AdminBulkBar
        count={selected.length}
        total={items.length}
        busy={bulkBusy}
        onSelectAll={() => toggleSelectAll(items.map((x) => x.id))}
        onArchive={() => void runBulkArchive()}
        onHardDelete={() => void runBulkHardDelete()}
        onClear={() => setSelected([])}
        archiveLabel="حذف"
        hardLabel="حذف دائمی"
      />

      {loading ? (
        <LumaSpin className="h-8 w-8" />
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">تصویری ثبت نشده</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="border-border bg-card overflow-hidden rounded-xl border"
            >
              <div className="relative aspect-[4/3] bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.alt_text || ""}
                  className="h-full w-full object-contain"
                />
                <label className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-black/50 px-2 py-1 text-xs text-white">
                  <input
                    type="checkbox"
                    checked={selected.includes(item.id)}
                    onChange={() => toggleSelect(item.id)}
                  />
                  انتخاب
                </label>
              </div>
              <div className="space-y-2 p-3">
                {/* URL کامل زیر هر تصویر */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium">آدرس تصویر</label>
                  <div className="flex items-start gap-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary min-w-0 flex-1 break-all text-xs underline-offset-2 hover:underline"
                      dir="ltr"
                    >
                      {item.url}
                    </a>
                    <button
                      type="button"
                      onClick={() => void copyUrl(item.id, item.url)}
                      className="border-border shrink-0 rounded border px-2 py-1 text-xs"
                    >
                      {copiedId === item.id ? "کپی شد" : "کپی"}
                    </button>
                  </div>
                <p className="text-muted-foreground text-[11px]">
                  نام فایل روی فضای ابری ثابت است؛ برای SEO از فیلد alt استفاده کنید.
                </p>
                </div>

                {item.product_id ? (
                  <Link
                    href={`/admin/products/${item.product_id}/edit`}
                    className="text-primary text-xs underline-offset-2 hover:underline"
                  >
                    {item.product_title || "محصول"}
                  </Link>
                ) : (
                  <span className="text-muted-foreground text-xs">بدون محصول</span>
                )}
                <div>
                  <label className="mb-1 block text-xs font-medium">
                    نام / متن جایگزین (alt)
                  </label>
                  <input
                    className="border-border bg-background w-full rounded-lg border px-2 py-1.5 text-sm"
                    value={draftAlt[item.id] ?? ""}
                    onChange={(e) =>
                      setDraftAlt((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    placeholder="مثلاً پیراهن آبی کلاسیک"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={savingId === item.id}
                    onClick={() => void saveMeta(item.id)}
                    className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    {savingId === item.id ? "..." : "ذخیره"}
                  </button>
                  <button
                    type="button"
                    disabled={bulkBusy}
                    onClick={() => void deleteOne(item)}
                    className="bg-destructive rounded-lg px-3 py-1.5 text-xs text-white dark:text-zinc-900 disabled:opacity-50"
                  >
                    حذف
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
