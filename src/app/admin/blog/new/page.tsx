"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  adminCreateBlogPostAction,
  adminListBlogCategoriesAction,
} from "@/app/admin/actions/blog";
import { adminListBlogTagsAction } from "@/app/admin/actions/tags";
import { Toolbar } from "@/components/ui/toolbar";
import { SeoAnalysisPanel, emptySeoValue, type SeoPanelValue } from "@/components/admin/seo-analysis-panel";

type Opt = { id: string; name: string };

export default function NewBlogPostPage() {
  const router = useRouter();
  const [cats, setCats] = useState<Opt[]>([]);
  const [tags, setTags] = useState<Opt[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [seo, setSeo] = useState<SeoPanelValue>(emptySeoValue());

  useEffect(() => {
    void (async () => {
      const [c, t] = await Promise.all([
        adminListBlogCategoriesAction(),
        adminListBlogTagsAction(),
      ]);
      if (c.ok)
        setCats(
          (c.items as { id: string; name: string }[]).map((x) => ({
            id: x.id,
            name: x.name,
          })),
        );
      if (t.ok)
        setTags(
          (t.items as { id: string; name: string; is_active?: boolean }[])
            .filter((x) => x.is_active !== false)
            .map((x) => ({ id: x.id, name: x.name })),
        );
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await adminCreateBlogPostAction({
      title,
      slug: slug || undefined,
      category_id: categoryId || null,
      excerpt: excerpt || undefined,
      body: body || undefined,
      cover_url: coverUrl || undefined,
      status,
      tag_ids: selectedTags,
      meta_title: seo.metaTitle || undefined,
      meta_description: seo.metaDescription || undefined,
      focus_keyphrases: seo.focusKeyphrases,
      og_title: seo.ogTitle || undefined,
      og_description: seo.ogDescription || undefined,
      og_image_url: seo.ogImageUrl || undefined,
      twitter_title: seo.twitterTitle || undefined,
      twitter_description: seo.twitterDescription || undefined,
      robots_index: seo.robotsIndex,
      robots_follow: seo.robotsFollow,
      is_cornerstone: seo.isCornerstone,
      canonical_url: seo.canonicalUrl || undefined,
    } as any);
    setBusy(false);
    if (!res.ok) {
      setErr(res.error === "title_required" ? "عنوان الزامی است" : res.error || "خطا");
      return;
    }
    router.push("/admin/blog");
  }

  return (
    <div className="w-full max-w-none space-y-4 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">افزودن مقاله</h1>
        <Link href="/admin/blog" className="text-sm underline">
          بازگشت
        </Link>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block space-y-1 text-sm">
          <span>عنوان *</span>
          <input
            className="border-border w-full rounded-xl border px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>اسلاگ</span>
          <input
            className="border-border w-full rounded-xl border px-3 py-2"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            dir="ltr"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>دسته</span>
          <select
            className="border-border w-full rounded-xl border px-3 py-2"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">—</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>خلاصه</span>
          <textarea
            className="border-border w-full rounded-xl border px-3 py-2"
            rows={2}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
          />
        </label>
        <div className="space-y-1 text-sm">
          <span>متن</span>
          <div className="border-border overflow-hidden rounded-xl border">
            <Toolbar />
            <textarea
              className="w-full border-0 px-3 py-2 focus:outline-none"
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </div>
        <label className="block space-y-1 text-sm">
          <span>تصویر کاور (URL — فقط ادمین)</span>
          <input
            className="border-border w-full rounded-xl border px-3 py-2"
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            dir="ltr"
            placeholder="https://..."
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>وضعیت</span>
          <select
            className="border-border w-full rounded-xl border px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "published")}
          >
            <option value="draft">پیش‌نویس</option>
            <option value="published">منتشر</option>
          </select>
        </label>
        <div className="space-y-2">
          <p className="text-sm font-medium">برچسب‌ها</p>
          <div className="flex flex-wrap gap-3">
            {tags.map((tg) => (
              <label key={tg.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tg.id)}
                  onChange={(e) =>
                    setSelectedTags((prev) =>
                      e.target.checked
                        ? [...prev, tg.id]
                        : prev.filter((id) => id !== tg.id),
                    )
                  }
                />
                {tg.name}
              </label>
            ))}
            {!tags.length ? (
              <span className="text-muted-foreground text-xs">برچسبی نیست</span>
            ) : null}
          </div>
        </div>
        <SeoAnalysisPanel
          pageName={title}
          slug={slug}
          shortDescription={excerpt}
          body={body}
          imageUrl={coverUrl}
          value={seo}
          onChange={setSeo}
        />
        {err ? <p className="text-destructive text-sm">{err}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-sm disabled:opacity-50"
        >
          {busy ? "…" : "انتشار"}
        </button>
      </form>
    </div>
  );
}
