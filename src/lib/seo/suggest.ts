import { measurePixelWidth, PIXEL_LIMITS, truncateToPixels } from "./pixel";

export type SuggestInput = {
  pageName: string;
  shortDescription?: string;
  body?: string;
  focusKeyphrases?: string[];
  siteName?: string;
};

function firstSentence(text: string, maxLen = 180): string {
  const t = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const m = t.match(/^(.+?[.!?؟。])\s/);
  const s = (m ? m[1] : t).trim();
  return s.length > maxLen ? s.slice(0, maxLen - 1) + "…" : s;
}

function pickKeyphrase(input: SuggestInput): string {
  const kps = (input.focusKeyphrases ?? []).map((k) => k.trim()).filter(Boolean);
  if (kps[0]) return kps[0];
  return (input.pageName || "").trim();
}

/** عنوان پیشنهادی با رعایت پیکسل دسکتاپ */
export function suggestMetaTitle(input: SuggestInput): string {
  const site = input.siteName || "شادجیل";
  const kp = pickKeyphrase(input);
  const name = (input.pageName || "").trim() || kp;
  const candidates = [
    `${name} | ${site}`,
    kp && kp !== name ? `${kp} | ${name} | ${site}` : "",
    `${name} — خرید آنلاین | ${site}`,
    name,
  ].filter(Boolean);

  for (const c of candidates) {
    if (measurePixelWidth(c) <= PIXEL_LIMITS.titleDesktopSafe) return c;
  }
  return truncateToPixels(candidates[0] || name, PIXEL_LIMITS.titleDesktopSafe);
}

/** توضیحات متا با کلیدواژه و پیکسل */
export function suggestMetaDescription(input: SuggestInput): string {
  const kp = pickKeyphrase(input);
  const name = (input.pageName || "").trim() || kp;
  const fromBody =
    firstSentence(input.shortDescription || "") ||
    firstSentence(input.body || "");

  let base = fromBody;
  if (!base) {
    base = `خرید ${name} با کیفیت عالی و ارسال سریع از فروشگاه تخصصی شادجیل.`;
  }
  if (kp && !base.includes(kp)) {
    base = `${kp} — ${base}`;
  }
  if (!/[.!?؟]$/.test(base)) base += ".";
  base += " مشاهده قیمت و ثبت سفارش آنلاین.";

  if (measurePixelWidth(base) <= PIXEL_LIMITS.descDesktop) return base;
  return truncateToPixels(base, PIXEL_LIMITS.descDesktop);
}

export function suggestSocial(input: SuggestInput): {
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
} {
  const title = suggestMetaTitle(input);
  const desc = suggestMetaDescription(input);
  return {
    ogTitle: title,
    ogDescription: desc,
    twitterTitle: title,
    twitterDescription: desc,
  };
}

export function suggestAll(input: SuggestInput) {
  const metaTitle = suggestMetaTitle(input);
  const metaDescription = suggestMetaDescription(input);
  const social = suggestSocial(input);
  return { metaTitle, metaDescription, ...social };
}
