"use client";
import { toJalaliInputValue, jalaliInputToIso } from "@/lib/dates/jalali";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  adminCreateProductAction,
  adminGetProductAction,
  adminUpdateProductAction,
  adminSyncProductVariantsAction,
  adminAddProductGalleryImageAction,
  adminCheckProductSlugAction,
} from "@/app/admin/actions/products";
import {
  adminListAttributesAction,
  adminGetProductAttributeValuesAction,
  adminSyncProductAttributesAction,
  type AttrWithOptions,
} from "@/app/admin/actions/attributes";
import {
  adminUploadProductImageAction,
  adminDeleteProductImageAction,
  adminSetPrimaryProductImageAction,
} from "@/app/admin/actions/media";
import { AdminMediaPicker } from "@/components/admin/media-picker";
import {
  adminListCategoriesAction,
  adminListBrandsAction,
} from "@/app/admin/actions/taxonomy";
import { adminListProductTagsAction } from "@/app/admin/actions/tags";
import { adminListSizeGuidesAction } from "@/app/admin/actions/products";
import { AdminPageHeader } from "@/components/admin/page-header";
import { LumaSpin } from "@/components/ui/luma-spin";
import { parseLocaleNumber } from "@/lib/numbers";
import { SeoAnalysisPanel, emptySeoValue, type SeoPanelValue } from "@/components/admin/seo-analysis-panel";
import { ensureAlt } from "@/lib/seo/image-alt";
import { resolveColorHex } from "@/lib/colors";

type Opt = { id: string; name: string };
type VRow = {
  key: string;
  id?: string;
  weight: string;
  roast_name: string;
  sku: string;
  price: string;
  original_price: string;
  stock: string;
  image_url: string;
};

function isColorAttribute(slug?: string | null, name?: string | null) {
  const s = (slug || "").trim().toLowerCase();
  const n = (name || "").trim().toLowerCase();
  if (s === "roast" || s === "colour" || s === "وضعیت محصول") return true;
  if (n === "وضعیت محصول" || n.includes("وضعیت محصول") || n === "roast" || n === "colour") return true;
  if (s.includes("roast") || s.includes("colour")) return true;
  return false;
}
function isSizeAttribute(slug?: string | null, name?: string | null) {
  const s = (slug || "").trim().toLowerCase();
  const n = (name || "").trim().toLowerCase();
  if (s === "weight" || s === "موجودی") return true;
  if (n === "موجودی" || n.includes("موجودی") || n === "weight") return true;
  return false;
}


const STEPS = [
  { id: 1, title: "هویت" },
  { id: 2, title: "طبقه‌بندی" },
  { id: 3, title: "مشخصات" },
  { id: 4, title: "رسانه" },
  { id: 5, title: "واریانت / موجودی" },
  { id: 6, title: "توضیحات" },
  { id: 7, title: "انتشار" },
] as const;

function emptyVariant(seed?: { price?: string; original?: string }): VRow {
  return {
    key: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    weight: "",
    roast_name: "",
    sku: "",
    price: seed?.price ?? "",
    original_price: seed?.original ?? "",
    stock: "0",
    image_url: "",
  };
}

function suggestSlug(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\u0600-\u06FFa-z0-9\-]+/g, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || `p-${Date.now()}`
  );
}

/** slug: فارسی + لاتین کوچک + عدد + خط تیره */
const SLUG_RE = /^[\u0600-\u06FFa-z0-9]+(?:-[\u0600-\u06FFa-z0-9]+)*$/;

export type ProductWizardProps = { productId?: string | null };

export function ProductWizard({ productId: initialId = null }: ProductWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [productId, setProductId] = useState<string | null>(initialId);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!!initialId);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [shortDesc, setShortDesc] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [featured, setFeatured] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [seo, setSeo] = useState<SeoPanelValue>(emptySeoValue());
  const [productType, setProductType] = useState<"simple" | "variable">("variable");
  const [simpleSku, setSimpleSku] = useState("");
  const [simpleStock, setSimpleStock] = useState("0");
  const [variants, setVariants] = useState<VRow[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [gallery, setGallery] = useState<{ id?: string; url: string }[]>([]);
  const [attrDefs, setAttrDefs] = useState<AttrWithOptions[]>([]);
  const weightAttr = attrDefs.find((a) => isSizeAttribute(a.slug, a.name));
  const roastAttr = attrDefs.find((a) => isColorAttribute(a.slug, a.name));
  const weightOpts = (weightAttr?.options ?? []) as Array<{ id: string; value: string; hex?: string | null }>;
  const roastOpts = (roastAttr?.options ?? []) as Array<{
    id: string;
    value: string;
    hex?: string | null;
  }>;
  const specDefs = attrDefs.filter(
    (a) => !isSizeAttribute(a.slug, a.name) && !isColorAttribute(a.slug, a.name),
  );
  const [attrValues, setAttrValues] = useState<Record<string, string>>({});
  const [loadedAttrRows, setLoadedAttrRows] = useState<
    Array<{ attribute_id: string; option_id?: string | null; value_text?: string | null }>
  >([]);

  /** option ids chosen on step 4 for variant axes */
  const [pickedSizeIds, setPickedSizeIds] = useState<string[]>([]);
  const [pickedColorIds, setPickedColorIds] = useState<string[]>([]);
  const pickedSizeOpts = weightOpts.filter((o) => pickedSizeIds.includes(o.id));
  const pickedColorOpts = roastOpts.filter((o) => pickedColorIds.includes(o.id));
  const weightChoices = pickedSizeOpts.length ? pickedSizeOpts : weightOpts;
  const roastChoices = pickedColorOpts.length ? pickedColorOpts : roastOpts;
  const [cats, setCats] = useState<Opt[]>([]);
  const [brands, setBrands] = useState<Opt[]>([]);
  const [tags, setTags] = useState<Opt[]>([]);
  const [guides, setGuides] = useState<Opt[]>([]);
  const [weightGuideId, setSizeGuideId] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [publishMode, setPublishMode] = useState<"draft" | "now" | "schedule">("draft");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "ok" | "taken" | "err">("idle");

  useEffect(() => {
    void (async () => {
      const [c, b, t, a, g] = await Promise.all([
        adminListCategoriesAction(),
        adminListBrandsAction(),
        adminListProductTagsAction(),
        adminListAttributesAction(),
        adminListSizeGuidesAction(),
      ]);
      const pickOpts = (res: { ok?: boolean; items?: { id: string; name: string }[]; data?: { id: string; name: string }[] }) =>
        ((res.items ?? res.data ?? []) as { id: string; name: string }[]).map((x) => ({ id: x.id, name: x.name }));
      if (c.ok) setCats(pickOpts(c as { items?: { id: string; name: string }[]; data?: { id: string; name: string }[] }));
      if (b.ok) setBrands(pickOpts(b as { items?: { id: string; name: string }[]; data?: { id: string; name: string }[] }));
      if (t.ok) setTags(pickOpts(t as { items?: { id: string; name: string }[]; data?: { id: string; name: string }[] }));
      if (a.ok) setAttrDefs((((a as { items?: AttrWithOptions[]; data?: AttrWithOptions[] }).items) ?? ((a as { data?: AttrWithOptions[] }).data) ?? []) as AttrWithOptions[]);
      if (g.ok) setGuides(pickOpts(g as { items?: { id: string; name: string }[]; data?: { id: string; name: string }[] }));
    })();
  }, []);

  useEffect(() => {
    if (!initialId) return;
    void (async () => {
      setLoading(true);
      const res = await adminGetProductAction(initialId);
      const payload = (res as { data?: unknown; product?: unknown }).data ?? (res as { product?: unknown }).product;
      if (!res.ok || !payload) {
        const detail = (res as { detail?: string }).detail;
        setErr(detail || (res as { error?: string }).error || "محصول یافت نشد");
        setLoading(false);
        return;
      }
      const p = payload as Record<string, unknown>;
      setName(String(p.name ?? ""));
      setSlug(String(p.slug ?? ""));
      setSlugTouched(true);
      setCategoryId(String(p.category_id ?? ""));
      setBrandId(String(p.brand_id ?? "") || "");
      setShortDesc(String(p.short_description ?? ""));
      setDescription(String(p.description ?? ""));
      setStatus((p.status as "draft" | "published") || "draft");
      setFeatured(!!p.is_featured);
      setIsNew(p.is_new !== false);
      setIsActive(p.is_active !== false);
      setImageUrl(String(p.image_url ?? ""));
      setSizeGuideId(String(p.weight_guide_id ?? "") || "");
      {
        const pa = p.published_at ? toJalaliInputValue(String(p.published_at)) : "";
        if (pa) {
          const d = new Date(pa);
          if (!Number.isNaN(d.getTime())) {
            const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            setPublishedAt(local);
            if (d.getTime() > Date.now()) setPublishMode("schedule");
            else if ((p.status as string) === "published") setPublishMode("now");
          }
        } else if ((p.status as string) === "published") setPublishMode("now");
      }
      const tagIds = (p.tag_ids as string[]) || [];
      setSelectedTags(tagIds);
      const varsAll = (p.variants as Array<Record<string, unknown>>) || [];
      // فقط واریانت‌های فعال؛ اگر هیچ فعالی نبود همه را بگیر (حالت بازیابی)
      const varsActive = varsAll.filter((v) => v.is_active !== false);
      const vars = varsActive.length ? varsActive : varsAll;
      const imgsEarly =
        (p.images as Array<{ url?: string; variant_id?: string | null }>) || [];
      const byVariant = new Map<string, string>();
      for (const im of imgsEarly) {
        if (im.variant_id && im.url) byVariant.set(String(im.variant_id), String(im.url));
      }
      const hasSized = vars.some((v) => v.weight || v.roast_name);
      if (hasSized || vars.length > 1) {
        setProductType("variable");
        setVariants(
          vars
            .filter((v) => v.weight || v.roast_name || vars.length === 1)
            .map((v) => {
              const vid = v.id ? String(v.id) : undefined;
              const pr = Number(v.price ?? 0);
              const op = Number(v.original_price ?? 0);
              // در UI: original_price = قیمت اصلی، price = قیمت بعد از تخفیف
              const main = op > pr && op > 0 ? op : pr > 0 ? pr : op;
              const sale = op > pr && pr > 0 ? pr : "";
              return {
                key: String(v.id ?? `e-${Math.random()}`),
                id: vid,
                weight: String(v.weight ?? ""),
                roast_name: String(v.roast_name ?? ""),
                sku: String(v.sku ?? ""),
                price: sale !== "" ? String(sale) : "",
                original_price: main > 0 ? String(main) : String(v.original_price ?? v.price ?? ""),
                stock: String(v.stock_quantity ?? v.stock ?? "0"),
                image_url: String(
                  (vid && byVariant.get(vid)) || v.image_url || "",
                ),
              };
            }),
        );
      } else if (vars[0]) {
        setProductType("variable");
        setSimpleSku(String(vars[0].sku ?? ""));
        setSimpleStock(String(vars[0].stock_quantity ?? vars[0].stock ?? "0"));
        const pr = Number(vars[0].price);
        const op = Number(vars[0].original_price);
        if (op && op > pr) {
          setPrice(String(op));
          setSalePrice(String(pr));
        } else {
          setPrice(String(vars[0].price ?? ""));
          setSalePrice("");
        }
        // واریانت ساده را هم در لیست نگه دار تا با ذخیره بعدی پاک نشود
        const vid = vars[0].id ? String(vars[0].id) : undefined;
        setVariants([
          {
            key: String(vars[0].id ?? `e-${Math.random()}`),
            id: vid,
            weight: "",
            roast_name: "",
            sku: String(vars[0].sku ?? ""),
            price: "",
            original_price: String(
              op && op > pr ? op : vars[0].price ?? "",
            ),
            stock: String(vars[0].stock_quantity ?? vars[0].stock ?? "0"),
            image_url: String(
              (vid && byVariant.get(vid)) || vars[0].image_url || "",
            ),
          },
        ]);
      }
      const imgs =
        (p.images as Array<{
          id?: string;
          url: string;
          is_primary?: boolean;
          variant_id?: string | null;
        }>) || [];
      setGallery(
        imgs
          .filter(
            (i) =>
              i.url &&
              !i.is_primary &&
              !i.variant_id &&
              i.url !== p.image_url,
          )
          .map((i) => ({ id: i.id, url: i.url })),
      );
      const av = await adminGetProductAttributeValuesAction(initialId);
      if (av.ok) {
        const list =
          (
            av as {
              values?: Array<{
                attribute_id: string;
                option_id?: string | null;
                value_text?: string | null;
              }>;
            }
          ).values ?? [];
        setLoadedAttrRows(list);
        const map: Record<string, string> = {};
        for (const row of list) {
          const oid = (row.option_id || row.value_text || "").trim();
          if (oid) map[row.attribute_id] = oid;
        }
        setAttrValues(map);
      }
      setSeo(
        emptySeoValue({
          metaTitle: String(p.meta_title ?? ""),
          metaDescription: String(p.meta_description ?? ""),
          focusKeyphrases: Array.isArray(p.focus_keyphrases) ? (p.focus_keyphrases as string[]) : [],
          ogTitle: String(p.og_title ?? ""),
          ogDescription: String(p.og_description ?? ""),
          ogImageUrl: String(p.og_image_url ?? ""),
          twitterTitle: String(p.twitter_title ?? ""),
          twitterDescription: String(p.twitter_description ?? ""),
          robotsIndex: p.robots_index !== false,
          robotsFollow: p.robots_follow !== false,
          isCornerstone: !!p.is_cornerstone,
          canonicalUrl: String(p.canonical_url ?? ""),
        }),
      );
      setProductId(initialId);
      setLoading(false);
    })();
  }, [initialId]);



  // همگام‌سازی مناسبت‌ها/وضعیت محصول انتخاب‌شده با مقادیر واقعی واریانت‌ها (بعد از ریلود خالی نماند)
  useEffect(() => {
    if (!variants.length) return;
    if (weightOpts.length) {
      const vals = new Set(
        variants.map((v) => String(v.weight || "").trim()).filter(Boolean),
      );
      if (vals.weight) {
        setPickedSizeIds((prev) => {
          const fromVars = weightOpts
            .filter((o) => vals.has(String(o.value).trim()))
            .map((o) => o.id);
          const merged = Array.from(new Set([...prev, ...fromVars]));
          return merged.length ? merged : prev;
        });
      }
    }
    if (roastOpts.length) {
      const vals = new Set(
        variants.map((v) => String(v.roast_name || "").trim()).filter(Boolean),
      );
      if (vals.weight) {
        setPickedColorIds((prev) => {
          const fromVars = roastOpts
            .filter((o) => vals.has(String(o.value).trim()))
            .map((o) => o.id);
          const merged = Array.from(new Set([...prev, ...fromVars]));
          return merged.length ? merged : prev;
        });
      }
    }
  }, [variants, weightOpts, roastOpts]);

  useEffect(() => {
    if (!loadedAttrRows.length || !attrDefs.length) return;
    const weightId = attrDefs.find((a) => isSizeAttribute(a.slug, a.name))?.id;
    const roastId = attrDefs.find((a) => isColorAttribute(a.slug, a.name))?.id;
    const weights: string[] = [];
    const roasts: string[] = [];
    const map: Record<string, string> = {};
    for (const row of loadedAttrRows) {
      const oid = (row.option_id || row.value_text || "").trim();
      if (!oid) continue;
      if (weightId && row.attribute_id === weightId) weights.push(oid);
      else if (roastId && row.attribute_id === roastId) roasts.push(oid);
      else map[row.attribute_id] = oid;
    }
    if (Object.keys(map).length) setAttrValues((m) => ({ ...map, ...m }));
    if (weights.length) setPickedSizeIds(weights);
    if (roasts.length) setPickedColorIds(roasts);
  }, [loadedAttrRows, attrDefs]);

  useEffect(() => {
    if (!slugTouched && name) setSlug(suggestSlug(name));
  }, [name, slugTouched]);

  const sellingPrice = useMemo(() => {
    const p = parseLocaleNumber(price) ?? 0;
    const s = parseLocaleNumber(salePrice) ?? 0;
    if (s > 0 && s < p) return s;
    return p;
  }, [price, salePrice]);

  const originalPrice = useMemo(() => {
    const p = parseLocaleNumber(price) ?? 0;
    const s = parseLocaleNumber(salePrice) ?? 0;
    if (s > 0 && s < p) return p;
    return p;
  }, [price, salePrice]);

  function validateStep(s: number): string | null {
    if (s === 1) {
      if (!name.trim()) return "نام محصول الزامی است";
      if (!slug.trim()) return "slug الزامی است";
      if (!SLUG_RE.test(slug.trim()))
        return "slug: حروف فارسی/لاتین، عدد و خط تیره";
      if (slugStatus === "taken") return "این slug قبلاً استفاده شده";
    }
    if (s === 3 && !categoryId) return "دسته الزامی است";
    if (s === 5 && !imageUrl) return "تصویر شاخص الزامی است";
    if (s === 5) {
      if (!variants.length) return "حداقل یک واریانت لازم است";
      for (const v of variants) {
        if (!v.weight && !v.roast_name) return "هر واریانت باید مناسبت‌ها یا وضعیت محصول داشته باشد";
        const sale = parseLocaleNumber(v.price) ?? 0;
        const original = parseLocaleNumber(v.original_price) ?? 0;
        const main = original > 0 ? original : sale;
        if (!(main > 0)) return "هر واریانت باید قیمت اصلی داشته باشد";
        if (sale > 0 && original > 0 && sale >= original)
          return "قیمت بعد از تخفیف باید کمتر از قیمت اصلی باشد";
      }
    }
    if (s === 6 && !shortDesc.trim()) return "توضیح کوتاه الزامی است";
    if (s === 6 && publishMode === "schedule") {
      if (!publishedAt.trim()) return "تاریخ زمان‌بندی الزامی است";
    }
    return null;
  }

  const persistCore = useCallback(
    async (opts: { finalStatus?: "draft" | "published" }) => {
      const st = opts.finalStatus ?? status;
      let resolvedStatus: "draft" | "published" = st;
      let resolvedPublishedAt: string | null = null;
      if (opts.finalStatus === "published" || publishMode === "now") {
        resolvedStatus = "published";
        resolvedPublishedAt = new Date().toISOString();
      } else if (publishMode === "schedule" && publishedAt) {
        resolvedStatus = "published";
        const iso = jalaliInputToIso(publishedAt);
        const d = iso ? new Date(iso) : new Date(NaN);
        resolvedPublishedAt = Number.isNaN(d.getTime()) ? null : d.toISOString();
      } else if (publishMode === "draft") {
        resolvedStatus = "draft";
        resolvedPublishedAt = null;
      }
      const base = {
        name: name.trim(),
        slug: slug.trim(),
        category_id: categoryId || null,
        brand_id: brandId || null,
        short_description: shortDesc,
        description,
        status: resolvedStatus,
        is_featured: featured,
        is_new: isNew,
        image_url: imageUrl || null,
        tag_ids: selectedTags,
        weight_guide_id: weightGuideId || null,
        published_at: resolvedPublishedAt,
        meta_title: seo.metaTitle || null,
        meta_description: seo.metaDescription || null,
        focus_keyphrases: seo.focusKeyphrases,
        og_title: seo.ogTitle || null,
        og_description: seo.ogDescription || null,
        og_image_url: seo.ogImageUrl || null,
        twitter_title: seo.twitterTitle || null,
        twitter_description: seo.twitterDescription || null,
        robots_index: seo.robotsIndex,
        robots_follow: seo.robotsFollow,
        is_cornerstone: seo.isCornerstone,
        canonical_url: seo.canonicalUrl || null,
        price: sellingPrice || 0,
        original_price: originalPrice || null,
        stock_quantity: parseLocaleNumber(simpleStock) || 0,
      };

      let id = productId;
      if (!id) {
        const res = await adminCreateProductAction({
          ...base,
          status: "draft",
        } as Parameters<typeof adminCreateProductAction>[0]);
        if (!res.ok) return { ok: false as const, error: (res as { error?: string }).error || "ایجاد ناموفق" };
        const createdId = (res as { id?: string }).id || (res as { data?: { id?: string } }).data?.id;
        if (!createdId) return { ok: false as const, error: "ایجاد ناموفق" };
        id = String(createdId);
        setProductId(id);
      } else {
        const upd = await adminUpdateProductAction(id, base as Parameters<typeof adminUpdateProductAction>[1]);
        if (!upd.ok) return { ok: false as const, error: (upd as { detail?: string }).detail || upd.error || "به‌روزرسانی ناموفق" };
      }

      // attributes (specs + picked weight/roast options for filters)
      {
        const rows: Array<{ attribute_id: string; option_id: string }> = Object.entries(attrValues)
          .filter(([, v]) => v)
          .map(([attribute_id, option_id]) => ({ attribute_id, option_id }));
        if (weightAttr?.id) {
          for (const oid of pickedSizeIds) rows.push({ attribute_id: weightAttr.id, option_id: oid });
        }
        if (roastAttr?.id) {
          for (const oid of pickedColorIds) rows.push({ attribute_id: roastAttr.id, option_id: oid });
        }
        const syncAttr = await adminSyncProductAttributesAction(id, rows as never);
        if (!syncAttr.ok) {
          return {
            ok: false as const,
            error:
              (syncAttr as { detail?: string }).detail ||
              (syncAttr as { error?: string }).error ||
              "ذخیره مشخصات ناموفق",
          };
        }
      }

      // variants
      const sp = sellingPrice;
      const op = originalPrice;
      let vPayload: Array<Record<string, unknown>>;
      vPayload = variants
        .map((v) => {
          const sale = parseLocaleNumber(v.price) ?? 0;
          const original = parseLocaleNumber(v.original_price) ?? 0;
          // original = قیمت اصلی؛ price = قیمت فروش (بعد از تخفیف اگر پر شده)
          const main =
            Number.isFinite(original) && original > 0
              ? original
              : Number.isFinite(sale) && sale > 0
                ? sale
                : 0;
          const sell =
            Number.isFinite(sale) && sale > 0 && original > 0 && sale < original
              ? sale
              : main;
          if (!(main > 0) && !(sell > 0)) return null;
          if (!v.weight && !v.roast_name) return null;
          const hx = resolveColorHex(v.roast_name, roastOpts.find((o) => o.value === v.roast_name)?.hex);
          return {
            id: v.id,
            weight: v.weight || null,
            roast_name: v.roast_name || null,
            roast_hex: hx,
            sku: v.sku || null,
            price: sell > 0 ? sell : main,
            original_price: main > sell ? main : sell > 0 ? sell : main,
            stock_quantity: parseLocaleNumber(v.stock) || 0,
            image_url: v.image_url || null,
            is_active: true,
          };
        })
        .filter(Boolean) as Array<Record<string, unknown>>;
      // پیش‌نویس / مراحل میانی: بدون واریانت هم OK — فقط موقع انتشار اجباری است
      const mustHaveVariants =
        opts.finalStatus === "published" ||
        (opts.finalStatus === undefined && st === "published");
      if (!vPayload.length) {
        if (mustHaveVariants) {
          return {
            ok: false as const,
            error: "حداقل یک واریانت با مناسبت‌ها/وضعیت محصول و قیمت معتبر لازم است",
          };
        }
        // draft: از sync واریانت رد شو
      } else {
        const syncV = await adminSyncProductVariantsAction(id, vPayload as never);
        if (!syncV.ok) {
          return {
            ok: false as const,
            error:
              (syncV as { detail?: string }).detail ||
              (syncV as { error?: string }).error ||
              "sync_variants",
          };
        }
      }

      if (opts.finalStatus === "published" || (opts.finalStatus === undefined && st === "published")) {
        const pub = await adminUpdateProductAction(id, { status: "published" });
        if (!pub.ok) {
          return {
            ok: false as const,
            error: (pub as { detail?: string }).detail || pub.error || "publish",
          };
        }
      }
      return { ok: true as const, id };
    },
    [
      productId, name, slug, categoryId, brandId, shortDesc, description, status,
      featured, isNew, isActive, imageUrl, selectedTags, attrValues, productType, pickedSizeIds, pickedColorIds, weightAttr, roastAttr, roastOpts,
      simpleSku, simpleStock, variants, sellingPrice, originalPrice,
      weightGuideId, publishedAt, publishMode,
    ],
  );

  
  async function checkSlug(): Promise<boolean> {
    const s = slug.trim();
    if (!s || !SLUG_RE.test(s)) {
      setSlugStatus("err");
      return false;
    }
    setSlugStatus("checking");
    const res = await adminCheckProductSlugAction(s, productId);
    if (!res.ok) {
      setSlugStatus("err");
      return false;
    }
    setSlugStatus(res.available ? "ok" : "taken");
    return res.available;
  }

  async function ensureProductId(): Promise<string | null> {
    if (productId) return productId;
    setBusy(true);
    const res = await persistCore({ finalStatus: "draft" });
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return null;
    }
    setOkMsg("پیش‌نویس ذخیره شد");
    return res.id;
  }

  async function goNext() {
    setErr("");
    setOkMsg("");
    if (step === 1) {
      const ok = await checkSlug();
      if (!ok) {
        setErr(slugStatus === "taken" ? "این slug قبلاً استفاده شده" : "slug نامعتبر است");
        return;
      }
    }
    const v = validateStep(step);
    if (v) {
      setErr(v);
      return;
    }
    if (step === 2 || step === 3) {
      const id = await ensureProductId();
      if (!id) return;
      // مشخصات باید همان لحظه ذخیره شوند
      if (step === 3) {
        setBusy(true);
        const res = await persistCore({ finalStatus: "draft" });
        setBusy(false);
        if (!res.ok) {
          setErr(res.error || "ذخیره مشخصات ناموفق");
          return;
        }
        setOkMsg("مشخصات ذخیره شد");
      }
    }
    if (step < 7) setStep((s) => s + 1);
  }

  function goPrev() {
    setErr("");
    setOkMsg("");
    if (step > 1) setStep((s) => s - 1);
  }

  async function saveDraft() {
    setBusy(true);
    setErr("");
    setOkMsg("");
    // محصول منتشرشده: وضعیت را حفظ کن و فقط به‌روز کن
    const res = await persistCore(
      status === "published"
        ? { finalStatus: "published" }
        : { finalStatus: "draft" },
    );
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setOkMsg(status === "published" ? "تغییرات به‌روز شد" : "پیش‌نویس ذخیره شد");
  }

  async function finishPublish() {
    const slugOk = await checkSlug();
    if (!slugOk) {
      setErr("slug تکراری یا نامعتبر — مرحله هویت");
      setStep(1);
      return;
    }
    const v = validateStep(6);
    if (v) {
      setErr(v);
      return;
    }
    // re-validate critical steps
    for (const s of [1, 2, 3, 4, 5, 6, 7] as const) {
      const e = validateStep(s);
      if (e) {
        setErr(`مرحله ${s}: ${e}`);
        setStep(s);
        return;
      }
    }
    setBusy(true);
    setErr("");
    const res = await persistCore({ finalStatus: status });
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    router.push("/admin/products");
    router.refresh();
  }


  function applyVariantImageFromMedia(
    idx: number,
    item: { url: string; id?: string },
  ) {
    setVariants((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, image_url: item.url } : r)),
    );
    setOkMsg("تصویر واریانت تنظیم شد");
  }

  async function applyMainImageFromMedia(item: { url: string; id?: string }) {
    setImageUrl(item.url);
    const id = productId || (await ensureProductId());
    if (!id) {
      setOkMsg("تصویر انتخاب شد — با ذخیره نهایی اعمال می‌شود");
      return;
    }
    setBusy(true);
    setErr("");
    const res = await adminSetPrimaryProductImageAction({
      productId: id,
      url: item.url,
      imageId: item.id || null,
    });
    setBusy(false);
    if (!res.ok) {
      setErr(String((res as { error?: string }).error || "ذخیره تصویر شاخص ناموفق"));
      return;
    }
    setOkMsg("تصویر شاخص ذخیره شد");
  }


  async function removeMainImage() {
    if (!imageUrl) return;
    setBusy(true);
    setErr("");
    try {
      await adminDeleteProductImageAction({ url: imageUrl });
      if (productId) {
        await adminUpdateProductAction(productId, { image_url: null } as never);
      }
      setImageUrl("");
      setOkMsg("تصویر شاخص حذف شد");
    } catch (e) {
      setErr("حذف تصویر شاخص ناموفق");
    } finally {
      setBusy(false);
    }
  }

  async function removeGalleryImage(g: { id?: string; url: string }) {
    setBusy(true);
    setErr("");
    try {
      const res = await adminDeleteProductImageAction({
        url: g.url,
        imageId: g.id || null,
      });
      if (!res.ok) {
        setErr(String((res as { error?: string }).error || "حذف ناموفق"));
        return;
      }
      setGallery((list) => list.filter((x) => x.url !== g.url && x.id !== g.id));
      setOkMsg("از گالری حذف شد");
    } catch {
      setErr("حذف از گالری ناموفق");
    } finally {
      setBusy(false);
    }
  }

  async function applyGalleryFromMedia(item: { url: string; id?: string; alt_text?: string | null }) {
    const id = await ensureProductId();
    if (!id) return;
    setBusy(true);
    setErr("");
    try {
      setGallery((g) => {
        if (g.some((x) => x.url === item.url)) return g;
        return [...g, { id: item.id, url: item.url }];
      });
      // اگر از آپلود با productId آمده، ردیف از قبل هست — دوباره insert نکن
      if (item.id) {
        setOkMsg("به گالری اضافه شد");
        return;
      }
      const add = await adminAddProductGalleryImageAction({
        productId: id,
        url: item.url,
        alt_text: item.alt_text ?? null,
      });
      if (!add.ok) {
        setErr(
          String(
            (add as { detail?: string }).detail ||
              (add as { error?: string }).error ||
              "افزودن به گالری ناموفق",
          ),
        );
        return;
      }
      const imgId = (add as { image?: { id?: string } }).image?.id;
      if (imgId) {
        setGallery((g) =>
          g.map((x) => (x.url === item.url ? { ...x, id: imgId } : x)),
        );
      }
      setOkMsg("به گالری اضافه شد");
    } finally {
      setBusy(false);
    }
  }

  async function onMainImage(file: File | null) {
    if (!file) return;
    const id = await ensureProductId();
    if (!id) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("productId", id);
    const res = await adminUploadProductImageAction(fd);
    setBusy(false);
    if (!res.ok) {
      setErr(res.error || "آپلود ناموفق");
      return;
    }
    const url = String((res as { url?: string }).url ?? (res as { data?: { url?: string } }).data?.url ?? "");
    if (url) {
      setImageUrl(url);
      await adminUpdateProductAction(id, { image_url: url } as never);
      setOkMsg("تصویر شاخص ذخیره شد");
    }
  }

  async function onGalleryImages(files: FileList | null) {
    if (!files || files.length === 0) return;
    const id = await ensureProductId();
    if (!id) return;
    setBusy(true);
    setErr("");
    let okCount = 0;
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("productId", id);
        const up = await adminUploadProductImageAction(fd);
        if (!up.ok) {
          errors.push(
            file.name +
              ":" +
              String((up as { error?: string }).error || "upload"),
          );
          continue;
        }
        const url = String(
          (up as { url?: string }).url ??
            (up as { data?: { url?: string } }).data?.url ??
            "",
        );
        if (!url) {
          errors.push(file.name + ":no_url");
          continue;
        }
        let imgId =
          (up as { imageId?: string }).imageId ||
          (up as { image?: { id?: string } }).image?.id;
        // اگر آپلود بدون product_id در DB مانده → صریح لینک کن
        if (!imgId) {
          const add = await adminAddProductGalleryImageAction({
            productId: id,
            url,
          });
          if (!add.ok) {
            errors.push(
              file.name +
                ":" +
                String(
                  (add as { detail?: string }).detail ||
                    (add as { error?: string }).error ||
                    "link",
                ),
            );
            continue;
          }
          imgId = (add as { image?: { id?: string } }).image?.id;
        }
        setGallery((g) => [...g, { id: imgId, url }]);
        okCount += 1;
      } catch (e) {
        errors.push(file.name + ":exception");
        console.error("[onGalleryImages]", e);
      }
    }
    setBusy(false);
    if (okCount) setOkMsg(okCount + " تصویر به گالری اضافه شد");
    if (errors.length) setErr("خطا در: " + errors.slice(0, 3).join("، "));
  }

  async function onVariantImage(idx: number, file: File | null) {
    if (!file) return;
    const id = await ensureProductId();
    if (!id) return;
    setBusy(true);
    setErr("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("productId", id);
    const up = await adminUploadProductImageAction(fd);
    setBusy(false);
    if (!up.ok) {
      setErr((up as { error?: string }).error || "آپلود تصویر واریانت ناموفق");
      return;
    }
    const url = String(
      (up as { url?: string }).url ??
        (up as { data?: { url?: string } }).data?.url ??
        "",
    );
    if (!url) {
      setErr("آپلود بدون URL");
      return;
    }
    setVariants((rows) =>
      rows.map((r, i) => (i === idx ? { ...r, image_url: url } : r)),
    );
    setOkMsg("تصویر واریانت تنظیم شد — با ذخیره به وضعیت محصول لینک می‌شود");
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LumaSpin />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4" dir="rtl">
      <AdminPageHeader
        title={productId ? "ویرایش محصول" : "محصول جدید"}
        description="ویزارد ۸مرحله‌ای ساخت و ویرایش"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          {busy ? <span className="text-muted-foreground">در حال ذخیره…</span> : null}
          {okMsg ? <span className="text-green-700 dark:text-green-400">{okMsg}</span> : null}
          {err ? <span className="text-destructive">{err}</span> : null}
        </div>
        <Link href="/admin/products" className="text-muted-foreground text-sm underline">
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
                    if (productId || s.id <= step) {
                      setStep(s.id);
                      setErr("");
                    }
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
              <span>نام محصول</span>
              <input
                className="border-input bg-background w-full rounded-lg border px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>slug</span>
              <input
                className="border-input bg-background w-full rounded-lg border px-3 py-2 font-mono text-sm"
                value={slug}
                onBlur={() => void checkSlug()}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
              />
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span>دسته</span>
              <select
                className="border-input bg-background w-full rounded-lg border px-3 py-2"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">انتخاب…</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>برچسب‌ها</span>
              <select
                className="border-input bg-background w-full rounded-lg border px-3 py-2"
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
              >
                <option value="">—</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-1 text-sm">
              <span>برچسب‌ها</span>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => {
                  const on = selectedTags.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={
                        on
                          ? "bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs"
                          : "bg-muted rounded-full px-3 py-1 text-xs"
                      }
                      onClick={() =>
                        setSelectedTags((prev) =>
                          on ? prev.filter((x) => x !== t.id) : [...prev, t.id],
                        )
                      }
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {!attrDefs.length ? (
              <p className="text-muted-foreground text-sm">مشخصه‌ای تعریف نشده. از ادمین → مشخصات اضافه کنید.</p>
            ) : null}
{/* وضعیت محصول: سواچ + نام */}
            {roastAttr ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">{roastAttr.name}</p>
                <div className="flex flex-wrap gap-2">
                  {(roastAttr.options ?? []).map((o) => {
                    const hx = resolveColorHex(
                      o.value,
                      (o as { hex?: string | null }).hex,
                    );
                    const on = pickedColorIds.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        className={
                          "border-border flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition " +
                          (on
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-muted")
                        }
                        onClick={() =>
                          setPickedColorIds((prev) =>
                            prev.includes(o.id)
                              ? prev.filter((x) => x !== o.id)
                              : [...prev, o.id],
                          )
                        }
                      >
                        <span
                          className="border-border inline-block h-4 w-4 shrink-0 rounded-full border shadow-sm"
                          style={{ backgroundColor: hx }}
                          title={hx}
                        />
                        <span>{o.value}</span>
                        {on ? <span className="text-xs">✓</span> : null}
                      </button>
                    );
                  })}
                </div>
                {!roastAttr.options?.length ? (
                  <p className="text-muted-foreground text-xs">
                    گزینه‌ای برای وضعیت محصول نیست — از مشخصات محصول وضعیت محصول + هگز اضافه کنید.
                  </p>
                ) : null}
              </div>
            ) : null}

            {/* مناسبت‌ها */}
            {weightAttr ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">{weightAttr.name}</p>
                <div className="flex flex-wrap gap-2">
                  {(weightAttr.options ?? []).map((o) => {
                    const on = pickedSizeIds.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        className={
                          "border-border rounded-full border px-3 py-1.5 text-sm transition " +
                          (on
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-muted")
                        }
                        onClick={() =>
                          setPickedSizeIds((prev) =>
                            prev.includes(o.id)
                              ? prev.filter((x) => x !== o.id)
                              : [...prev, o.id],
                          )
                        }
                      >
                        {o.value}
                        {on ? " ✓" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* بقیه مشخصات */}
            {specDefs.map((a) => (
              <label key={a.id} className="block space-y-1 text-sm">
                <span>{a.name}</span>
                <select
                  className="border-input bg-background w-full rounded-lg border px-3 py-2"
                  value={attrValues[a.id] ?? ""}
                  onChange={(e) =>
                    setAttrValues((m) => ({ ...m, [a.id]: e.target.value }))
                  }
                >
                  <option value="">—</option>
                  {(a.options ?? []).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.value}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <p className="text-muted-foreground text-xs">
              وضعیت محصول و مناسبت‌ها انتخاب‌شده در فیلتر فروشگاه می‌آیند؛ در گام واریانت برای هر ردیف وضعیت محصول/مناسبت‌ها را جداگانه مشخص کنید.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-sm font-medium">تصویر شاخص</p>
              {imageUrl ? (
                <div className="mb-2 flex items-start gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt=""
                    className="h-32 w-32 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    className="text-destructive text-xs underline"
                    disabled={busy}
                    onClick={() => void removeMainImage()}
                  >
                    حذف تصویر شاخص
                  </button>
                </div>
              ) : null}
              <AdminMediaPicker
                uploadLabel="آپلود تصویر شاخص"
                onSelect={(item) => void applyMainImageFromMedia(item)}
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">گالری</p>
              {gallery.length > 0 ? (
                <div className="mb-2 flex flex-wrap gap-2">
                  {gallery.map((g) => (
                    <div key={g.id || g.url} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={g.url}
                        alt=""
                        className="h-20 w-20 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        className="bg-destructive text-destructive-foreground absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] leading-none"
                        title="حذف"
                        disabled={busy}
                        onClick={() => void removeGalleryImage(g)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <AdminMediaPicker
                productId={productId}
                multiple
                uploadLabel="آپلود تصاویر گالری"
                onSelect={(item) => void applyGalleryFromMedia(item)}
              />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-xs">
              برای هر ترکیب مناسبت‌ها/وضعیت محصول یک ردیف بسازید. قیمت اصلی و در صورت نیاز قیمت بعد از تخفیف را وارد کنید.
              مناسبت‌ها و وضعیت محصول هر ردیف را از لیست زیر انتخاب کنید.
            </p>
            <button
              type="button"
              className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-sm"
              onClick={() =>
                setVariants((rows) => [
                  ...rows,
                  emptyVariant(),
                ])
              }
            >
              + افزودن واریانت
            </button>

            {
              <div className="space-y-3">
                {variants.map((v, idx) => (
                  <div key={v.key} className="border-border space-y-2 rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-3">
                      {v.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={v.image_url}
                          alt=""
                          className="h-14 w-14 rounded-lg border object-cover"
                        />
                      ) : (
                        <div className="text-muted-foreground flex h-14 w-14 items-center justify-center rounded-lg border border-dashed text-[10px]">
                          بدون تصویر
                        </div>
                      )}
                      <div className="min-w-[220px] flex-1">
                        <AdminMediaPicker
                          productId={productId}
                          uploadLabel="آپلود / انتخاب تصویر واریانت"
                          onSelect={(item) => applyVariantImageFromMedia(idx, item)}
                        />
                      </div>
                      {v.image_url ? (
                        <button
                          type="button"
                          className="text-destructive text-xs"
                          onClick={() =>
                            setVariants((rows) =>
                              rows.map((r, i) =>
                                i === idx ? { ...r, image_url: "" } : r,
                              ),
                            )
                          }
                        >
                          حذف تصویر
                        </button>
                      ) : null}
                      {v.roast_name ? (
                        <span className="text-muted-foreground text-xs">
                          وضعیت محصول: {v.roast_name}
                        </span>
                      ) : null}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <select
                        className="border-input bg-background min-w-[5.5rem] rounded-lg border px-2 py-1.5 text-sm"
                        value={v.weight}
                        onChange={(e) => {
                          const weight = e.target.value;
                          setVariants((rows) =>
                            rows.map((r, i) => (i === idx ? { ...r, weight } : r)),
                          );
                        }}
                      >
                        <option value="">مناسبت‌ها…</option>
                        {weightOpts.map((o) => (
                          <option key={o.id} value={o.value}>
                            {o.value}
                          </option>
                        ))}
                      </select>
                      <div className="relative min-w-[9rem]">
                      <details className="group">
                        <summary className="border-input bg-background flex cursor-pointer list-none items-center gap-2 rounded-lg border px-2 py-1.5 text-sm [&::-webkit-details-marker]:hidden">
                          {v.roast_name ? (
                            <>
                              <span
                                className="border-border h-4 w-4 shrink-0 rounded-full border shadow-sm"
                                style={{
                                  backgroundColor: resolveColorHex(
                                    v.roast_name,
                                    roastOpts.find((o) => o.value === v.roast_name)?.hex,
                                  ),
                                }}
                              />
                              <span className="truncate">{v.roast_name}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">وضعیت محصول…</span>
                          )}
                        </summary>
                        <div className="border-border bg-background absolute z-30 mt-1 max-h-52 w-full min-w-[10rem] overflow-auto rounded-lg border py-1 shadow-md">
                          <button
                            type="button"
                            className="hover:bg-muted flex w-full items-center gap-2 px-2 py-1.5 text-right text-sm"
                            onClick={(e) => {
                              const d = (e.currentTarget as HTMLElement).closest("details");
                              if (d) d.removeAttribute("open");
                              setVariants((rows) =>
                                rows.map((r, i) =>
                                  i === idx ? { ...r, roast_name: "" } : r,
                                ),
                              );
                            }}
                          >
                            <span className="text-muted-foreground">—</span>
                          </button>
                          {roastOpts.map((o) => (
                            <button
                              key={o.id}
                              type="button"
                              className="hover:bg-muted flex w-full items-center gap-2 px-2 py-1.5 text-right text-sm"
                              onClick={(e) => {
                                const d = (e.currentTarget as HTMLElement).closest("details");
                                if (d) d.removeAttribute("open");
                                setVariants((rows) =>
                                  rows.map((r, i) =>
                                    i === idx ? { ...r, roast_name: o.value } : r,
                                  ),
                                );
                              }}
                            >
                              <span
                                className="border-border inline-block h-4 w-4 shrink-0 rounded-full border shadow-sm"
                                style={{
                                  backgroundColor: resolveColorHex(o.value, o.hex),
                                }}
                              />
                              <span>{o.value}</span>
                            </button>
                          ))}
                        </div>
                      </details>
                    </div>
                      <input
                        placeholder="SKU"
                        className="border-input bg-background rounded-lg border px-2 py-1.5 text-sm"
                        value={v.sku}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVariants((rows) =>
                            rows.map((r, i) => (i === idx ? { ...r, sku: val } : r)),
                          );
                        }}
                      />
                      <input
                        className="border-input bg-background rounded-lg border px-2 py-1.5 text-sm"
                        placeholder="قیمت اصلی"
                        inputMode="numeric"
                        value={v.original_price}
                        title="قیمت اصلی"
                        onChange={(e) => {
                          const val = e.target.value;
                          setVariants((rows) =>
                            rows.map((r, i) =>
                              i === idx ? { ...r, original_price: val } : r,
                            ),
                          );
                        }}
                      />
                      <input
                        className="border-input bg-background rounded-lg border px-2 py-1.5 text-sm"
                        placeholder="قیمت بعد از تخفیف"
                        inputMode="numeric"
                        value={v.price}
                        title="قیمت بعد از تخفیف"
                        onChange={(e) => {
                          const val = e.target.value;
                          setVariants((rows) =>
                            rows.map((r, i) => (i === idx ? { ...r, price: val } : r)),
                          );
                        }}
                      />
                      <input
                        placeholder="موجودی"
                        className="border-input bg-background rounded-lg border px-2 py-1.5 text-sm"
                        value={v.stock}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVariants((rows) =>
                            rows.map((r, i) => (i === idx ? { ...r, stock: val } : r)),
                          );
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="text-destructive text-xs"
                      onClick={() => setVariants((rows) => rows.filter((_, i) => i !== idx))}
                    >
                      حذف واریانت
                    </button>
                  </div>
                ))}
              </div>
            }
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span>توضیح کوتاه</span>
              <textarea
                className="border-input bg-background min-h-[80px] w-full rounded-lg border px-3 py-2"
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>توضیح کامل</span>
              <textarea
                className="border-input bg-background min-h-[160px] w-full rounded-lg border px-3 py-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span>وضعیت</span>
              <select
                className="border-input bg-background w-full rounded-lg border px-3 py-2"
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "published")}
              >
                <option value="draft">پیش‌نویس</option>
                <option value="published">انتشار</option>
              </select>
            </label>
            <div className="space-y-2 text-sm">
              <span className="block">زمان انتشار</span>
              <div className="flex flex-wrap gap-2">
                {([["draft", "پیش‌نویس"], ["now", "همین حالا"], ["schedule", "زمان‌بندی"]] as const).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    className={publishMode === k ? "bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs" : "bg-muted rounded-lg px-3 py-1.5 text-xs"}
                    onClick={() => {
                      setPublishMode(k);
                      if (k === "draft") setStatus("draft");
                      else setStatus("published");
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {publishMode === "schedule" ? (
                <div className="mt-2">
                  <input type="text" inputMode="numeric" placeholder="1404/07/06 15:30" dir="ltr" className="border-input bg-background w-full rounded-lg border px-3 py-2 font-mono text-sm" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
                  <p className="text-muted-foreground mt-1 text-[11px]">فرمت شمسی: سال/ماه/روز ساعت:دقیقه</p>
                </div>
              ) : null}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
              ویژه (featured)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} />
              نشان «جدید»
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              فعال در فروشگاه
            </label>
                      </div>
        )}
      </div>


      <SeoAnalysisPanel
        pageName={name}
        slug={slug}
        shortDescription={shortDesc}
        body={description}
        imageUrl={imageUrl}
        forceNoindex={false}
        value={seo}
        onChange={setSeo}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="border-border rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
          disabled={step <= 1 || busy}
          onClick={goPrev}
        >
          قبلی
        </button>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="border-border rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
            disabled={busy}
            onClick={() => void saveDraft()}
          >
            ذخیره پیش‌نویس
          </button>
          {step < 7 ? (
            <button
              type="button"
              className="border-border rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
              disabled={busy}
              onClick={() => void goNext()}
            >
              بعدی
            </button>
          ) : null}
          <button
            type="button"
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm disabled:opacity-40"
            disabled={busy}
            onClick={() => void finishPublish()}
          >
            {initialId ? "به‌روزرسانی" : "انتشار"}
          </button>
        </div>
      </div>
    </div>
  );
}
