/**
 * Dynamic SEO placeholders, e.g. %%name%% | %%site%%
 */

export type SeoTemplateContext = {
  name?: string;
  title?: string;
  site?: string;
  slug?: string;
  category?: string;
  brand?: string;
  keyphrase?: string;
  description?: string;
  year?: string | number;
};

const DEFAULT_SITE = "شادجیل";

export function applySeoTemplate(
  template: string | null | undefined,
  ctx: SeoTemplateContext,
): string {
  if (!template) return "";
  const site = ctx.site || DEFAULT_SITE;
  const name = ctx.name || ctx.title || "";
  const year = String(ctx.year ?? new Date().getFullYear());

  const map: Record<string, string> = {
    name,
    title: ctx.title || name,
    site,
    sitename: site,
    slug: ctx.slug || "",
    category: ctx.category || "",
    brand: ctx.brand || "",
    keyphrase: ctx.keyphrase || "",
    keyword: ctx.keyphrase || "",
    description: (ctx.description || "").slice(0, 160),
    year,
    sep: "|",
  };

  return template.replace(/%%([a-zA-Z0-9_]+)%%/g, (_, key: string) => {
    const k = key.toLowerCase();
    return map[k] != null ? map[k] : "";
  }).replace(/\s+\|\s+$/g, "").replace(/^\s*\|\s+/g, "").replace(/\s{2,}/g, " ").trim();
}

export const SEO_TEMPLATE_HINT =
  "متغیرها: %%name%% %%title%% %%site%% %%slug%% %%category%% %%brand%% %%keyphrase%% %%year%%";
