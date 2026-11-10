"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminMediaPicker } from "@/components/admin/media-picker";
import { LumaSpin } from "@/components/ui/luma-spin";
import { SeoAnalysisPanel, emptySeoValue, type SeoPanelValue } from "@/components/admin/seo-analysis-panel";

export type CatalogKind = "category" | "brand" | "tag";

export type CatalogItem = {
  id: string;
  name: string;
  slug: string;
  is_active?: boolean;
  image_url?: string | null;
  short_description?: string | null;
  description?: string | null;
  parent_id?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  focus_keyphrases?: string[] | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  robots_index?: boolean | null;
  robots_follow?: boolean | null;
  canonical_url?: string | null;
};

type SaveFn = (input: {
  name: string;
  slug?: string;
  image_url?: string | null;
  short_description?: string | null;
  description?: string | null;
  is_active?: boolean;
  parent_id?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  focus_keyphrases?: string[];
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  robots_index?: boolean;
  robots_follow?: boolean;
  canonical_url?: string | null;
}) => Promise<{ ok: true; id?: string } | { ok: false; error: string }>;

const STEPS = [
  { id: 1, title: "هویت" },
  { id: 2, title: "تصویر شاخص" },
  { id: 3, title: "توضیحات" },
  { id: 4, title: "انتشار" },
] as const;

const SLUG_RE = /^[\u0600-\u06FFa-z0-9]+(?:-[\u0600-\u06FFa-z0-9]+)*$/;

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const LABELS: Record<CatalogKind, { titleNew: string; titleEdit: string; listHref: string; nameLabel: string }> = {
  category: {
    titleNew: "دسته جدید",
    titleEdit: "ویرایش دسته",
    listHref: "/admin/categories",
    nameLabel: "نام دسته",
  },
  brand: {
    titleNew: "برچسب جدید",
    titleEdit: "ویرایش برچسب",
    listHref: "/admin/brands",
    nameLabel: "نام برچسب",
  },
  tag: {
    titleNew: "برچسب جدید",
    titleEdit: "ویرایش برچسب",
    listHref: "/admin/tags",
    nameLabel: "نام برچسب",
  },
};

export function CatalogWizard({
  kind,
  saveAction,
  initial,
  parentOptions,
  loadingInitial,
}: {
  kind: CatalogKind;
  saveAction: SaveFn;
  initial?: CatalogItem | null;
  parentOptions?: { id: string; name: string }[];
  loadingInitial?: boolean;
}) {
  const router = useRouter();
  const meta = LABELS[kind];
  const isEdit = !!initial?.id;

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [showMedia, setShowMedia] = useState(false);

  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [parentId, setParentId] = useState(initial?.parent_id ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [shortDesc, setShortDesc] = useState(initial?.short_description ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active !== false);
  const [seo, setSeo] = useState<SeoPanelValue>(() => emptySeoValue({ robotsIndex: kind !== "tag" }));

  useEffect(() => {
    if (!initial) return;
    setName(initial.name ?? "");
    setSlug(initial.slug ?? "");
    setSlugTouched(true);
    setParentId(initial.parent_id ?? "");
    setImageUrl(initial.image_url ?? "");
    setShortDesc(initial.short_description ?? "");
    setDescription(initial.description ?? "");
    setIsActive(initial.is_active !== false);
    setSeo(
      emptySeoValue({
        metaTitle: String(initial.meta_title ?? ""),
        metaDescription: String(initial.meta_description ?? ""),
        focusKeyphrases: Array.isArray(initial.focus_keyphrases) ? initial.focus_keyphrases : [],
        ogTitle: String(initial.og_title ?? ""),
        ogDescription: String(initial.og_description ?? ""),
        ogImageUrl: String(initial.og_image_url ?? ""),
        robotsIndex: kind === "tag" ? false : initial.robots_index !== false,
        robotsFollow: initial.robots_follow !== false,
        canonicalUrl: String(initial.canonical_url ?? ""),
      }),
    );
  }, [initial, kind]);

  const autoSlug = useMemo(() => slugify(name), [name]);
  const displaySlug = slugTouched ? slug : autoSlug;

  function validate(s: number): string | null {
    if (s === 1) {
      if (!name.trim() || name.trim().length < 2) return "نام الزامی است (حداقل ۲ حرف)";
      if (!displaySlug.trim()) return "slug الزامی است";
      if (!SLUG_RE.test(displaySlug.trim())) return "slug: حروف فارسی/لاتین، عدد و خط تیره";
    }
    return null;
  }

  function goNext() {
    setErr("");
    setOkMsg("");
    const v = validate(step);
    if (v) {
      setErr(v);
      return;
    }
    if (!slugTouched) setSlug(autoSlug);
    if (step < 4) setStep((x) => x + 1);
  }
  function goPrev() {
    setErr("");
    setOkMsg("");
    if (step > 1) setStep((x) => x - 1);
  }

  async function finish() {
    for (const s of [1, 2, 3, 4] as const) {
      const e = validate(s);
      if (e) {
        setErr(e);
        setStep(s);
        return;
      }
    }
    setBusy(true);
    setErr("");
    const res = await saveAction({
      name: name.trim(),
      slug: displaySlug.trim(),
      image_url: imageUrl || null,
      short_description: shortDesc || null,
      description: description || null,
      is_active: isActive,
      parent_id: kind === "category" ? parentId || null : undefined,
      meta_title: seo.metaTitle || null,
      meta_description: seo.metaDescription || null,
      focus_keyphrases: seo.focusKeyphrases,
      og_title: seo.ogTitle || null,
      og_description: seo.ogDescription || null,
      og_image_url: seo.ogImageUrl || null,
      robots_index: kind === "tag" ? false : seo.robotsIndex,
      robots_follow: seo.robotsFollow,
      canonical_url: seo.canonicalUrl || null,
    } as any);
    setBusy(false);
    if (!res.ok) {
      setErr(
        res.error === "bad_name"
          ? "نام نامعتبر"
          : res.error === "bad_slug"
            ? "اسلاگ نامعتبر"
            : res.error === "slug_taken"
              ? "این اسلاگ قبلاً استفاده شده — اسلاگ دیگری بگذارید"
              : res.error === "not_found"
                ? "مورد یافت نشد"
                : "خطا در ذخیره. اگر اسلاگ تکراری است تغییرش دهید، وگرنه چند ثانیه بعد دوباره تلاش کنید.",
      );
      return;
    }
    setOkMsg("ذخیره شد");
    router.push(meta.listHref);
    router.refresh();
  }

  if (loadingInitial) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LumaSpin />
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen space-y-4 p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            {isEdit ? meta.titleEdit : meta.titleNew}
          </h1>
          <div className="mt-1 flex flex-wrap gap-3 text-sm">
            {okMsg ? <span className="text-green-700 dark:text-green-400">{okMsg}</span> : null}
            {err ? <span className="text-destructive">{err}</span> : null}
          </div>
        </div>
        <Link href={meta.listHref} className="text-muted-foreground text-sm underline">
          بازگشت به لیست
        </Link>
      </div>

      <nav className="border-border overflow-x-auto rounded-xl border p-3">
        <ol className="flex min-w-max gap-1">
          {STEPS.map((s) => {
            const active = s.id === step;
            const done = s.id < step;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => {
                    setStep(s.id);
                    setErr("");
                  }}
                  className={[
                    "rounded-lg px-3 py-1.5 text-xs transition",
                    active
                      ? "bg-primary text-primary-foreground"
                      : done
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60",
                  ].join(" ")}
                >
                  {s.id}. {s.title}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="border-border space-y-4 rounded-xl border p-4">
        <h2 className="text-primary font-semibold">
          مرحله {step}: {STEPS[step - 1]?.title}
        </h2>

        {step === 1 && (
          <div className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span>{meta.nameLabel}</span>
              <input
                className="border-input bg-background w-full rounded-lg border px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>اسلاگ (slug)</span>
              <input
                className="border-input bg-background w-full rounded-lg border px-3 py-2 font-mono text-sm"
                dir="ltr"
                value={displaySlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
              />
            </label>
            {kind === "category" && parentOptions && parentOptions.length > 0 ? (
              <label className="block space-y-1 text-sm">
                <span>دسته والد (اختیاری)</span>
                <select
                  className="border-input bg-background w-full rounded-lg border px-3 py-2"
                  value={parentId || ""}
                  onChange={(e) => setParentId(e.target.value)}
                >
                  <option value="">بدون والد (ریشه)</option>
                  {parentOptions
                    .filter((p) => p.id !== initial?.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
            ) : null}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">تصویر شاخص (اختیاری)</p>
            {imageUrl ? (
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" className="h-28 w-28 rounded-xl border object-cover" />
                <button
                  type="button"
                  className="text-destructive text-sm underline"
                  onClick={() => setImageUrl("")}
                >
                  حذف تصویر
                </button>
              </div>
            ) : null}
            <button
              type="button"
              className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm"
              onClick={() => setShowMedia((v) => !v)}
            >
              {showMedia ? "بستن رسانه" : "انتخاب / آپلود از رسانه"}
            </button>
            {showMedia ? (
              <AdminMediaPicker
                onSelect={(item) => {
                  setImageUrl(item.url);
                  setShowMedia(false);
                  setOkMsg("تصویر انتخاب شد");
                }}
              />
            ) : null}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span>توضیح کوتاه</span>
              <textarea
                className="border-input bg-background min-h-[80px] w-full rounded-lg border px-3 py-2 text-sm"
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>توضیح کامل</span>
              <textarea
                className="border-input bg-background min-h-[160px] w-full rounded-lg border px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              <span>فعال / منتشر</span>
            </label>
            <div className="bg-muted/40 space-y-1 rounded-xl p-3 text-sm">
              <p>
                <span className="text-muted-foreground">نام:</span> {name || "—"}
              </p>
              <p>
                <span className="text-muted-foreground">slug:</span>{" "}
                <span className="font-mono" dir="ltr">
                  {displaySlug || "—"}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">تصویر:</span> {imageUrl ? "دارد" : "ندارد"}
              </p>
            </div>
          </div>
        )}
      </div>


      <SeoAnalysisPanel
        pageName={name}
        slug={displaySlug}
        shortDescription={shortDesc}
        body={description}
        imageUrl={imageUrl || ""}
        forceNoindex={kind === "tag"}
        value={seo}
        onChange={setSeo}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          disabled={step <= 1 || busy}
          onClick={goPrev}
          className="border-border rounded-xl border px-4 py-2 text-sm disabled:opacity-40"
        >
          قبلی
        </button>
        <div className="flex flex-wrap gap-2">
          {step < 4 ? (
            <button
              type="button"
              disabled={busy}
              onClick={goNext}
              className="border-border rounded-xl border px-4 py-2 text-sm disabled:opacity-40"
            >
              بعدی
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void finish()}
            className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm disabled:opacity-40"
          >
            {busy ? "…" : isEdit ? "به‌روزرسانی" : "انتشار"}
          </button>
        </div>
      </div>
    </div>
  );
}
