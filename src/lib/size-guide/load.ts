import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service";

export type SizeGuideView = {
  id: string;
  name: string;
  description: string | null;
  rows: {
    weight_label: string;
    chest_cm: number | null;
    waist_cm: number | null;
    shoulder_cm: number | null;
    sleeve_cm: number | null;
    length_cm: number | null;
    neck_cm: number | null;
  }[];
};

async function loadGuideById(
  supabase: Awaited<ReturnType<typeof createClient>>,
  guideId: string,
): Promise<SizeGuideView | null> {
  const { data: guide, error } = await supabase
    .from("weight_guides")
    .select("id, name, description")
    .eq("id", guideId)
    .maybeSingle();
  if (error || !guide) return null;

  const { data: rows, error: rErr } = await supabase
    .from("weight_guide_rows")
    .select(
      "weight_label, chest_cm, waist_cm, shoulder_cm, sleeve_cm, length_cm, neck_cm, sort_order",
    )
    .eq("weight_guide_id", guide.id)
    .order("sort_order", { ascending: true });
  if (rErr) return null;

  return {
    id: guide.id as string,
    name: (guide.name as string) || "راهنمای مناسبت‌ها بسته‌بندی",
    description: (guide.description as string | null) ?? null,
    rows: (rows ?? []).map((r) => ({
      weight_label: String(r.weight_label ?? ""),
      chest_cm: r.chest_cm != null ? Number(r.chest_cm) : null,
      waist_cm: r.waist_cm != null ? Number(r.waist_cm) : null,
      shoulder_cm: r.shoulder_cm != null ? Number(r.shoulder_cm) : null,
      sleeve_cm: r.sleeve_cm != null ? Number(r.sleeve_cm) : null,
      length_cm: r.length_cm != null ? Number(r.length_cm) : null,
      neck_cm: r.neck_cm != null ? Number(r.neck_cm) : null,
    })),
  };
}

/** Global first guide (legacy / weight-guide page). */
export async function loadPrimarySizeGuide(): Promise<SizeGuideView | null> {
  try {
    const supabase = createServiceClient();
    const { data: guide, error } = await supabase
      .from("weight_guides")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error || !guide) return null;
    return loadGuideById(supabase, guide.id as string);
  } catch (e) {
    console.error("[loadPrimarySizeGuide]", e);
    return null;
  }
}

/**
 * PDP preference:
 * 1) explicit product.weight_guide_id
 * 2) first guide for product.category_id
 * 3) global primary
 */
export async function loadSizeGuideForProduct(opts: {
  weightGuideId?: string | null;
  categoryId?: string | null;
}): Promise<SizeGuideView | null> {
  try {
    const supabase = createServiceClient();
    if (opts.weightGuideId) {
      const g = await loadGuideById(supabase, opts.weightGuideId);
      if (g) return g;
    }
    if (opts.categoryId) {
      const { data: byCat } = await supabase
        .from("weight_guides")
        .select("id")
        .eq("category_id", opts.categoryId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (byCat?.id) {
        const g = await loadGuideById(supabase, byCat.id as string);
        if (g) return g;
      }
    }
    return loadPrimarySizeGuide();
  } catch (e) {
    console.error("[loadSizeGuideForProduct]", e);
    return null;
  }
}

export function formatCm(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("fa-IR", { maximumFractionDigits: 1 });
}
