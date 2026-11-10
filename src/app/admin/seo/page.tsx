"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  adminGetSeoPageAction,
  adminUpsertSeoPageAction,
  type SeoPageKey,
} from "@/app/admin/actions/seo-pages";
import {
  SeoAnalysisPanel,
  emptySeoValue,
  type SeoPanelValue,
} from "@/components/admin/seo-analysis-panel";
import { LumaSpin } from "@/components/ui/luma-spin";

const TABS: { key: SeoPageKey; label: string; slug: string }[] = [
  { key: "shop_plp", label: "PLP فروشگاه", slug: "products" },
  { key: "blog_plp", label: "PLP مقالات", slug: "blog" },
];

export default function AdminSeoPlpPage() {
  const [tab, setTab] = useState<SeoPageKey>("shop_plp");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [title, setTitle] = useState("");
  const [bodyPreview, setBodyPreview] = useState("");
  const [seo, setSeo] = useState<SeoPanelValue>(emptySeoValue());

  useEffect(() => {
    setLoading(true);
    setMsg("");
    void (async () => {
      const res = await adminGetSeoPageAction(tab);
      if (res.ok && res.row) {
        const r = res.row as any;
        setTitle(String(r.title ?? ""));
        setBodyPreview(String(r.body_preview ?? ""));
        setSeo(
          emptySeoValue({
            metaTitle: String(r.meta_title ?? ""),
            metaDescription: String(r.meta_description ?? ""),
            focusKeyphrases: Array.isArray(r.focus_keyphrases) ? r.focus_keyphrases : [],
            ogTitle: String(r.og_title ?? ""),
            ogDescription: String(r.og_description ?? ""),
            ogImageUrl: String(r.og_image_url ?? ""),
            robotsIndex: r.robots_index !== false,
            robotsFollow: r.robots_follow !== false,
            canonicalUrl: String(r.canonical_url ?? ""),
          }),
        );
      } else {
        setTitle(tab === "shop_plp" ? "محصولات" : "مقالات");
        setBodyPreview("");
        setSeo(emptySeoValue());
      }
      setLoading(false);
    })();
  }, [tab]);

  async function save() {
    setBusy(true);
    setMsg("");
    const res = await adminUpsertSeoPageAction(tab, {
      title,
      body_preview: bodyPreview,
      meta_title: seo.metaTitle,
      meta_description: seo.metaDescription,
      focus_keyphrases: seo.focusKeyphrases,
      og_title: seo.ogTitle,
      og_description: seo.ogDescription,
      og_image_url: seo.ogImageUrl,
      robots_index: seo.robotsIndex,
      robots_follow: seo.robotsFollow,
      canonical_url: seo.canonicalUrl,
    });
    setBusy(false);
    setMsg(res.ok ? "ذخیره شد" : "خطا در ذخیره");
  }

  const slug = TABS.find((t) => t.key === tab)?.slug || "";

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-primary text-2xl font-bold">سئو صفحات لیست (PLP)</h1>
        <Link href="/admin/seo/report" className="text-primary text-sm underline">گزارش SEO سایت</Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? "bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm"
                : "bg-muted rounded-xl px-4 py-2 text-sm"
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center py-12">
          <LumaSpin />
        </div>
      ) : (
        <>
          <label className="block space-y-1 text-sm">
            <span>عنوان صفحه (H1)</span>
            <input
              className="border-input bg-background w-full rounded-lg border px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>متن کوتاه برای تحلیل (اختیاری)</span>
            <textarea
              className="border-input bg-background min-h-[80px] w-full rounded-lg border px-3 py-2 text-sm"
              value={bodyPreview}
              onChange={(e) => setBodyPreview(e.target.value)}
            />
          </label>
          <SeoAnalysisPanel
            pageName={title}
            slug={slug}
            shortDescription={seo.metaDescription || bodyPreview}
            body={bodyPreview}
            value={seo}
            onChange={setSeo}
          />
          {msg ? <p className="text-sm">{msg}</p> : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm disabled:opacity-50"
          >
            {busy ? "…" : "به‌روزرسانی"}
          </button>
        </>
      )}
    </div>
  );
}
