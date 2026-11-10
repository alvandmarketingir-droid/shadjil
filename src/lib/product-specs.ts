import { createClient } from "@/lib/supabase/server";

const HIDE_ON_PDP = new Set(["weight", "roast", "موجودی", "وضعیت محصول"]);

export async function getProductSpecRows(productId: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("product_attribute_values")
      .select(
        `
        attribute_id,
        option_id,
        value_text,
        attributes:attribute_id ( name, slug, sort_order ),
        attribute_options:option_id ( value )
      `,
      )
      .eq("product_id", productId);

    if (error) {
      console.error("[getProductSpecRows]", productId, error.message);
      return [] as { label: string; value: string }[];
    }
    if (!data?.length) return [] as { label: string; value: string }[];

    type Row = { label: string; value: string; sort: number };
    const rows: Row[] = [];
    for (const row of data as Array<Record<string, unknown>>) {
      const attr = row.attributes as {
        name?: string;
        slug?: string;
        sort_order?: number | null;
      } | null;
      const opt = row.attribute_options as { value?: string } | null;
      const slug = (attr?.slug || "").trim().toLowerCase();
      if (HIDE_ON_PDP.has(slug)) continue;
      const label = (attr?.name || attr?.slug || "").trim();
      const value = (
        opt?.value ||
        (typeof row.value_text === "string" ? row.value_text : "") ||
        ""
      ).trim();
      if (label && value) {
        rows.push({
          label,
          value,
          sort: Number(attr?.sort_order ?? 999),
        });
      }
    }
    rows.sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label, "fa"));
    return rows.map(({ label, value }) => ({ label, value }));
  } catch (e) {
    console.error("[getProductSpecRows]", e);
    return [] as { label: string; value: string }[];
  }
}
