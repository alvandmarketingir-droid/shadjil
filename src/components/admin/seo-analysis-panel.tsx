"use client";

import { useMemo, useState } from "react";
import {
  analyzeSeo,
  type SeoAnalysisResult,
} from "@/lib/seo/analyze";
import {
  measurePixelWidth,
  PIXEL_LIMITS,
  truncateToPixels,
} from "@/lib/seo/pixel";
import { adminSeoSuggestAction } from "@/app/admin/actions/seo-ai";
import { suggestMetaTitle, suggestMetaDescription, suggestSocial } from "@/lib/seo/suggest";
import { summarizeText } from "@/lib/seo/summarize";
import { applySeoTemplate } from "@/lib/seo/template";
import { adminSuggestInternalLinksAction } from "@/app/admin/actions/seo-links";

export type SeoPanelValue = {
  metaTitle: string;
  metaDescription: string;
  focusKeyphrases: string[];
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  twitterTitle: string;
  twitterDescription: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  isCornerstone: boolean;
  canonicalUrl: string;
};

export type SeoAnalysisPanelProps = {
  pageName: string;
  slug?: string;
  shortDescription?: string;
  body?: string;
  imageUrl?: string;
  siteName?: string;
  siteUrl?: string;
  forceNoindex?: boolean;
  value: SeoPanelValue;
  onChange: (next: SeoPanelValue) => void;
};

const DEFAULT_SITE = "شادجیل";

function scoreColor(score: number): string {
  if (score >= 75) return "text-green-600 dark:text-green-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function barColor(score: number): string {
  if (score >= 75) return "bg-green-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function statusDot(status: "good" | "ok" | "bad" | "na"): string {
  if (status === "good") return "bg-green-500";
  if (status === "ok") return "bg-amber-400";
  if (status === "bad") return "bg-red-500";
  return "bg-muted-foreground/40";
}

export function SeoAnalysisPanel({
  pageName,
  slug,
  shortDescription = "",
  body = "",
  imageUrl = "",
  siteName = DEFAULT_SITE,
  siteUrl = "https://shadjil.ir",
  forceNoindex = false,
  value,
  onChange,
}: SeoAnalysisPanelProps) {
  const [showSocial, setShowSocial] = useState(false);
  const [kpInput, setKpInput] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState("");
  const [linkHints, setLinkHints] = useState<{ title: string; href: string; type: string }[]>([]);
  const [linksBusy, setLinksBusy] = useState(false);

  const tplCtx = {
    name: pageName,
    title: pageName,
    site: siteName,
    slug: slug || "",
    keyphrase: value.focusKeyphrases[0] || "",
    description: shortDescription,
  };
  const effectiveTitle =
    applySeoTemplate(value.metaTitle, tplCtx) ||
    (pageName ? `${pageName} | ${siteName}` : siteName);
  const effectiveDesc =
    applySeoTemplate(value.metaDescription, tplCtx) ||
    shortDescription.slice(0, 160) ||
    "";

  const analysis: SeoAnalysisResult = useMemo(
    () =>
      analyzeSeo({
        keyphrases: value.focusKeyphrases,
        title: effectiveTitle,
        metaDescription: effectiveDesc,
        h1: pageName,
        intro: shortDescription,
        body,
        forceNoindex,
        robotsIndex: forceNoindex ? false : value.robotsIndex,
      }),
    [
      value.focusKeyphrases,
      effectiveTitle,
      effectiveDesc,
      pageName,
      shortDescription,
      body,
      forceNoindex,
      value.robotsIndex,
    ],
  );

  const displayUrl = `${siteUrl.replace(/\/$/, "")}/${(slug || "").replace(/^\//, "")}`;

  function patch(partial: Partial<SeoPanelValue>) {
    onChange({ ...value, ...partial });
  }

  function addKeyphrase() {
    const t = kpInput.trim();
    if (!t) return;
    if (value.focusKeyphrases.length >= 5) return;
    if (value.focusKeyphrases.some((k) => k.toLowerCase() === t.toLowerCase())) {
      setKpInput("");
      return;
    }
    patch({ focusKeyphrases: [...value.focusKeyphrases, t] });
    setKpInput("");
  }

  function removeKp(i: number) {
    patch({
      focusKeyphrases: value.focusKeyphrases.filter((_, idx) => idx !== i),
    });
  }

  const titlePx = measurePixelWidth(effectiveTitle);
  const descPx = measurePixelWidth(effectiveDesc);
  const serpTitle = truncateToPixels(effectiveTitle, PIXEL_LIMITS.titleDesktop);
  const serpDesc = truncateToPixels(effectiveDesc, PIXEL_LIMITS.descDesktop);
  const serpTitleMobile = truncateToPixels(effectiveTitle, PIXEL_LIMITS.titleMobile);
  const serpDescMobile = truncateToPixels(effectiveDesc, PIXEL_LIMITS.descMobile);

  const ogT = value.ogTitle.trim() || effectiveTitle;
  const ogD = value.ogDescription.trim() || effectiveDesc;
  const ogImg = value.ogImageUrl.trim() || imageUrl;

  const suggestPayload = {
    pageName,
    shortDescription,
    body,
    focusKeyphrases: value.focusKeyphrases,
    siteName,
  };

  function applySuggest(
    mode: "all" | "title" | "desc" | "social",
    data: {
      metaTitle: string;
      metaDescription: string;
      ogTitle: string;
      ogDescription: string;
      twitterTitle: string;
      twitterDescription: string;
    },
  ) {
    if (mode === "title") {
      onChange({ ...value, metaTitle: data.metaTitle });
    } else if (mode === "desc") {
      onChange({ ...value, metaDescription: data.metaDescription });
    } else if (mode === "social") {
      onChange({
        ...value,
        ogTitle: data.ogTitle,
        ogDescription: data.ogDescription,
        twitterTitle: data.twitterTitle,
        twitterDescription: data.twitterDescription,
      });
    } else {
      onChange({
        ...value,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        ogTitle: data.ogTitle,
        ogDescription: data.ogDescription,
        twitterTitle: data.twitterTitle,
        twitterDescription: data.twitterDescription,
      });
    }
  }

  async function runAiSuggest(mode: "all" | "title" | "desc" | "social") {
    setAiBusy(true);
    setAiMsg("");
    // ۱) همیشه پیشنهاد محلی فوری (بدون سرور)
    const local = {
      metaTitle: suggestMetaTitle(suggestPayload),
      metaDescription: suggestMetaDescription(suggestPayload),
      ...suggestSocial(suggestPayload),
    };
    applySuggest(mode, local);
    setAiMsg("پیشنهاد اعمال شد");

    // ۲) در پس‌زمینه اگر سرور/OpenAI جواب داد، جایگزین کن
    try {
      const res = await adminSeoSuggestAction(suggestPayload);
      if (res.ok && res.source === "openai") {
        applySuggest(mode, {
          metaTitle: res.metaTitle,
          metaDescription: res.metaDescription,
          ogTitle: res.ogTitle,
          ogDescription: res.ogDescription,
          twitterTitle: res.twitterTitle,
          twitterDescription: res.twitterDescription,
        });
        setAiMsg("پیشنهاد AI اعمال شد");
      }
    } catch {
      /* محلی کافی است */
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="border-border mt-6 space-y-4 rounded-xl border p-4" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-primary text-lg font-semibold">تحلیل و بهینه‌سازی SEO</h3>
        <div className="flex items-center gap-4 text-sm">
          <span className={scoreColor(analysis.score)}>
            SEO: <strong>{analysis.score}</strong>/100
          </span>
          <span className={scoreColor(analysis.readabilityScore)}>
            خوانایی: <strong>{analysis.readabilityScore}</strong>/100
          </span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <div className="text-muted-foreground mb-1 flex justify-between text-xs">
            <span>امتیاز SEO</span>
            <span>{analysis.score}%</span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div className={`h-full transition-all ${barColor(analysis.score)}`} style={{ width: `${analysis.score}%` }} />
          </div>
        </div>
        <div>
          <div className="text-muted-foreground mb-1 flex justify-between text-xs">
            <span>خوانایی</span>
            <span>{analysis.readabilityScore}%</span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div className={`h-full transition-all ${barColor(analysis.readabilityScore)}`} style={{ width: `${analysis.readabilityScore}%` }} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={aiBusy}
          onClick={() => void runAiSuggest("all")}
          className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          {aiBusy ? "…" : "پیشنهاد کامل SEO"}
        </button>
        <button
          type="button"
          disabled={aiBusy}
          onClick={() => void runAiSuggest("title")}
          className="border-border rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
        >
          پیشنهاد Title
        </button>
        <button
          type="button"
          disabled={aiBusy}
          onClick={() => void runAiSuggest("desc")}
          className="border-border rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
        >
          پیشنهاد Description
        </button>
        <button
          type="button"
          disabled={aiBusy}
          onClick={() => void runAiSuggest("social")}
          className="border-border rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
        >
          پر کردن Social
        </button>
        <button
          type="button"
          disabled={aiBusy}
          onClick={() => {
            const sum = summarizeText(body || shortDescription || "", {
              keyphrase: value.focusKeyphrases[0],
            });
            if (sum) {
              onChange({ ...value, metaDescription: sum });
              setAiMsg("خلاصه از متن اعمال شد");
            } else {
              setAiMsg("متنی برای خلاصه نیست");
            }
          }}
          className="border-border rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
        >
          خلاصه از متن
        </button>
        {aiMsg ? <span className="text-muted-foreground self-center text-xs">{aiMsg}</span> : null}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">کلیدواژه کانونی (Focus Keyphrase) — تا ۵ مورد</label>
        <div className="flex flex-wrap gap-2">
          {value.focusKeyphrases.map((k, i) => (
            <span key={`${k}-${i}`} className="bg-muted inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs">
              {i === 0 ? <span className="text-primary font-bold">۱</span> : null}
              {k}
              <button type="button" className="text-muted-foreground hover:text-destructive mr-0.5" onClick={() => removeKp(i)} aria-label="حذف">×</button>
            </span>
          ))}
        </div>
        {value.focusKeyphrases.length < 5 ? (
          <div className="flex gap-2">
            <input className="border-input bg-background flex-1 rounded-lg border px-3 py-2 text-sm" placeholder="کلیدواژه را بنویسید و Enter بزنید" value={kpInput} onChange={(e) => setKpInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyphrase(); } }} />
            <button type="button" className="bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm" onClick={addKeyphrase}>افزودن</button>
          </div>
        ) : null}
      </div>

      <label className="block space-y-1 text-sm">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span>عنوان SEO (Title)</span>
          <span className={analysis.titleStatus === "over" ? "text-red-600" : analysis.titleStatus === "warn" ? "text-amber-600" : "text-muted-foreground"}>{titlePx}px / {PIXEL_LIMITS.titleDesktop}px</span>
        </span>
        <input className="border-input bg-background w-full rounded-lg border px-3 py-2" value={value.metaTitle} onChange={(e) => patch({ metaTitle: e.target.value })} placeholder={pageName ? `${pageName} | ${siteName}` : "عنوان صفحه در گوگل"} />
      </label>

      <label className="block space-y-1 text-sm">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span>توضیح متا (Meta Description)</span>
          <span className={analysis.descStatus === "over" ? "text-red-600" : analysis.descStatus === "warn" ? "text-amber-600" : "text-muted-foreground"}>{descPx}px / {PIXEL_LIMITS.descDesktop}px</span>
        </span>
        <textarea className="border-input bg-background min-h-[72px] w-full rounded-lg border px-3 py-2 text-sm" value={value.metaDescription} onChange={(e) => patch({ metaDescription: e.target.value })} placeholder="خلاصه جذاب برای نمایش زیر عنوان در نتایج گوگل" />
      </label>

      <div className="space-y-3">
        <p className="text-sm font-medium">پیش‌نمایش SERP</p>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="border-border rounded-lg border bg-white p-3 text-left dark:bg-zinc-950" dir="ltr">
            <p className="text-muted-foreground mb-1 text-[11px]">Desktop</p>
            <p className="truncate text-[14px] leading-5 text-[#202124] dark:text-zinc-300">{displayUrl}</p>
            <p className="text-[20px] leading-6 text-[#1a0dab] dark:text-blue-400">{serpTitle || "عنوان صفحه"}</p>
            <p className="mt-1 text-[14px] leading-5 text-[#4d5156] dark:text-zinc-400">{serpDesc || "توضیح متا اینجا نمایش داده می‌شود…"}</p>
          </div>
          <div className="border-border mx-auto w-full max-w-[360px] rounded-lg border bg-white p-3 text-left dark:bg-zinc-950" dir="ltr">
            <p className="text-muted-foreground mb-1 text-[11px]">Mobile</p>
            <p className="truncate text-[12px] text-[#202124] dark:text-zinc-300">{displayUrl}</p>
            <p className="text-[16px] leading-5 text-[#1a0dab] dark:text-blue-400">{serpTitleMobile || "عنوان صفحه"}</p>
            <p className="mt-1 text-[13px] leading-5 text-[#4d5156] dark:text-zinc-400">{serpDescMobile || "توضیح متا اینجا نمایش داده می‌شود…"}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">بررسی زنده</p>
        <ul className="space-y-1.5">
          {analysis.checks.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-sm">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusDot(c.status)}`} />
              <span>
                <span className="font-medium">{c.label}:</span>{" "}
                <span className="text-muted-foreground">{c.message}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <button
          type="button"
          disabled={linksBusy}
          onClick={() => {
            setLinksBusy(true);
            void adminSuggestInternalLinksAction({
              keyphrase: value.focusKeyphrases[0],
              pageName,
              excludeSlug: slug,
            }).then((res) => {
              setLinksBusy(false);
              if (res.ok) setLinkHints(res.links);
              else setLinkHints([]);
            });
          }}
          className="border-border rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
        >
          {linksBusy ? "…" : "پیشنهاد لینک داخلی"}
        </button>
        {linkHints.length > 0 ? (
          <ul className="text-muted-foreground space-y-1 text-xs">
            {linkHints.map((l) => (
              <li key={l.href}>
                <span className="text-primary font-medium">{l.type}:</span>{" "}
                <a href={l.href} className="underline" target="_blank" rel="noreferrer">
                  {l.title}
                </a>{" "}
                <code className="text-[10px]" dir="ltr">
                  {l.href}
                </code>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4" checked={forceNoindex ? false : value.robotsIndex} disabled={forceNoindex} onChange={(e) => patch({ robotsIndex: e.target.checked })} />
          <span>اجازه ایندکس (index){forceNoindex ? <span className="text-muted-foreground mr-1 text-xs"> — برای برچسب‌ها همیشه noindex</span> : null}</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4" checked={value.robotsFollow} onChange={(e) => patch({ robotsFollow: e.target.checked })} />
          <span>دنبال کردن لینک‌ها (follow)</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4" checked={value.isCornerstone} onChange={(e) => patch({ isCornerstone: e.target.checked })} />
          <span>محتوای ستون (Cornerstone)</span>
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span>Canonical URL (اختیاری)</span>
        <input className="border-input bg-background w-full rounded-lg border px-3 py-2 font-mono text-sm" dir="ltr" value={value.canonicalUrl} onChange={(e) => patch({ canonicalUrl: e.target.value })} placeholder={displayUrl} />
      </label>

      <div className="border-border border-t pt-3">
        <button type="button" className="text-primary text-sm underline" onClick={() => setShowSocial((v) => !v)}>
          {showSocial ? "بستن پیش‌نمایش شبکه‌های اجتماعی" : "Social Preview / Open Graph / X"}
        </button>
        {showSocial ? (
          <div className="mt-3 space-y-3">
            <label className="block space-y-1 text-sm">
              <span>OG Title</span>
              <input className="border-input bg-background w-full rounded-lg border px-3 py-2" value={value.ogTitle} onChange={(e) => patch({ ogTitle: e.target.value })} placeholder={effectiveTitle} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>OG Description</span>
              <textarea className="border-input bg-background min-h-[60px] w-full rounded-lg border px-3 py-2 text-sm" value={value.ogDescription} onChange={(e) => patch({ ogDescription: e.target.value })} placeholder={effectiveDesc} />
            </label>
            <label className="block space-y-1 text-sm">
              <span>OG Image URL</span>
              <input className="border-input bg-background w-full rounded-lg border px-3 py-2 font-mono text-sm" dir="ltr" value={value.ogImageUrl} onChange={(e) => patch({ ogImageUrl: e.target.value })} placeholder={imageUrl || "https://…"} />
            </label>
            <div className="border-border max-w-md overflow-hidden rounded-xl border bg-white dark:bg-zinc-950">
              {ogImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ogImg} alt="" className="aspect-[1.91/1] w-full object-cover" />
              ) : (
                <div className="bg-muted text-muted-foreground flex aspect-[1.91/1] items-center justify-center text-xs">بدون تصویر</div>
              )}
              <div className="space-y-1 p-3 text-left" dir="ltr">
                <p className="text-muted-foreground text-[11px] uppercase">{siteUrl.replace(/^https?:\/\//, "")}</p>
                <p className="line-clamp-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{ogT || "Title"}</p>
                <p className="text-muted-foreground line-clamp-2 text-xs">{ogD || "Description"}</p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span>Twitter Title</span>
                <input className="border-input bg-background w-full rounded-lg border px-3 py-2" value={value.twitterTitle} onChange={(e) => patch({ twitterTitle: e.target.value })} placeholder={ogT} />
              </label>
              <label className="block space-y-1 text-sm">
                <span>Twitter Description</span>
                <input className="border-input bg-background w-full rounded-lg border px-3 py-2" value={value.twitterDescription} onChange={(e) => patch({ twitterDescription: e.target.value })} placeholder={ogD} />
              </label>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function emptySeoValue(overrides?: Partial<SeoPanelValue>): SeoPanelValue {
  return {
    metaTitle: "",
    metaDescription: "",
    focusKeyphrases: [],
    ogTitle: "",
    ogDescription: "",
    ogImageUrl: "",
    twitterTitle: "",
    twitterDescription: "",
    robotsIndex: true,
    robotsFollow: true,
    isCornerstone: false,
    canonicalUrl: "",
    ...overrides,
  };
}
