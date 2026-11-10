"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminListProductImagesAction,
  adminUploadProductImageAction,
  type MediaListItem,
} from "@/app/admin/actions/media";
import { LumaSpin } from "@/components/ui/luma-spin";

type Props = {
  onSelect: (item: { url: string; id?: string; alt_text?: string | null }) => void;
  productId?: string | null;
  multiple?: boolean;
  className?: string;
  uploadLabel?: string;
};

export function AdminMediaPicker({
  onSelect,
  productId,
  multiple = false,
  className = "",
  uploadLabel = "انتخاب فایل برای آپلود",
}: Props) {
  const [tab, setTab] = useState<"upload" | "library">("upload");
  const [items, setItems] = useState<MediaListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminListProductImagesAction(120);
    setLoading(false);
    if (!res.ok) {
      setError("بارگذاری رسانه ناموفق");
      setItems([]);
      return;
    }
    setItems(res.items ?? []);
  }, []);

  useEffect(() => {
    if (tab === "library") void load();
  }, [tab, load]);

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        if (productId) fd.append("productId", productId);
        const up = await adminUploadProductImageAction(fd);
        if (!up.ok) {
          setError(String((up as { error?: string }).error || "آپلود ناموفق"));
          continue;
        }
        const url = String((up as { url?: string }).url || "");
        if (!url) {
          setError("آپلود بدون URL");
          continue;
        }
        onSelect({
          url,
          id: (up as { imageId?: string }).imageId,
          alt_text: file.name?.slice(0, 120) || null,
        });
      }
    } finally {
      setUploading(false);
    }
  }

  const filtered = q.trim()
    ? items.filter((it) => {
        const s = q.trim().toLowerCase();
        return (
          (it.url || "").toLowerCase().includes(s) ||
          (it.alt_text || "").toLowerCase().includes(s) ||
          (it.product_title || "").toLowerCase().includes(s)
        );
      })
    : items;

  function togglePick(id: string) {
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function confirmPicked() {
    const map = new Map(items.map((i) => [i.id, i]));
    const list = (
      multiple ? picked : picked.slice(0, 1)
    )
      .map((id) => map.get(id))
      .filter(Boolean) as MediaListItem[];
    for (const it of list) {
      onSelect({ url: it.url, id: it.id, alt_text: it.alt_text });
    }
    setPicked([]);
  }

  return (
    <div
      className={`border-border overflow-hidden rounded-xl border bg-card ${className}`}
      dir="rtl"
    >
      <div className="border-border flex border-b">
        <button
          type="button"
          className={
            tab === "upload"
              ? "border-primary text-primary border-b-2 px-4 py-2 text-sm font-medium"
              : "text-muted-foreground px-4 py-2 text-sm"
          }
          onClick={() => setTab("upload")}
        >
          آپلود جدید
        </button>
        <button
          type="button"
          className={
            tab === "library"
              ? "border-primary text-primary border-b-2 px-4 py-2 text-sm font-medium"
              : "text-muted-foreground px-4 py-2 text-sm"
          }
          onClick={() => setTab("library")}
        >
          از رسانه‌های قبلی
        </button>
      </div>

      <div className="p-3">
        {error ? (
          <p className="text-destructive mb-2 text-xs">{error}</p>
        ) : null}

        {tab === "upload" ? (
          <div className="space-y-2">
            <label className="border-border hover:bg-muted/40 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-sm">
              <span className="text-muted-foreground">
                {uploading ? "در حال آپلود…" : uploadLabel}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple={multiple}
                className="hidden"
                disabled={uploading}
                onChange={(e) => void onUpload(e.target.files)}
              />
            </label>
            <p className="text-muted-foreground text-[11px]">
              تصویر با واترمارک پردازش و در کتابخانه رسانه ذخیره می‌شود.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="جستجو در آلت / محصول / لینک…"
                className="border-input bg-background flex-1 rounded-lg border px-3 py-1.5 text-sm"
              />
              <button
                type="button"
                className="border-border rounded-lg border px-3 py-1.5 text-xs"
                onClick={() => void load()}
              >
                تازه‌سازی
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <LumaSpin />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                رسانه‌ای نیست — اول از تب آپلود یا صفحه رسانه اضافه کنید.
              </p>
            ) : (
              <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                {filtered.map((it) => {
                  const on = picked.includes(it.id);
                  return (
                    <button
                      key={it.id}
                      type="button"
                      title={it.alt_text || it.product_title || it.url}
                      onClick={() => {
                        if (multiple) togglePick(it.id);
                        else {
                          setPicked([it.id]);
                          onSelect({
                            url: it.url,
                            id: it.id,
                            alt_text: it.alt_text,
                          });
                        }
                      }}
                      className={
                        on
                          ? "ring-primary relative aspect-square overflow-hidden rounded-lg ring-2"
                          : "border-border relative aspect-square overflow-hidden rounded-lg border"
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={it.url}
                        alt={it.alt_text || ""}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {multiple && picked.length > 0 ? (
              <button
                type="button"
                className="bg-primary text-primary-foreground w-full rounded-lg py-2 text-sm"
                onClick={confirmPicked}
              >
                افزودن {picked.length} تصویر انتخاب‌شده
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
