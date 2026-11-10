import { measurePixelWidth, PIXEL_LIMITS, truncateToPixels } from "./pixel";

/** خلاصه متن برای Meta Description / excerpt */
export function summarizeText(
  htmlOrText: string,
  opts?: { maxPixels?: number; keyphrase?: string },
): string {
  const maxPx = opts?.maxPixels ?? PIXEL_LIMITS.descDesktop;
  const t = (htmlOrText || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!t) return "";

  // prefer first 1–2 sentences
  const sentences = t.split(/(?<=[.!?؟。])\s+/).filter((s) => s.length > 15);
  let out = sentences.slice(0, 2).join(" ") || t;

  const kp = (opts?.keyphrase || "").trim();
  if (kp && !out.includes(kp)) {
    out = `${kp}: ${out}`;
  }

  if (measurePixelWidth(out) <= maxPx) return out;
  return truncateToPixels(out, maxPx);
}
