import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { filterBlockedBrands } from "@/lib/brands/blocked";

export const dynamic = "force-dynamic";

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  try {
    const client = sb();
    const [cats, brands, colors, sizes, attrs, opts] = await Promise.all([
      client.from("categories").select("name,slug").order("name").limit(40),
      client.from("brands").select("name,slug").order("name").limit(40),
      client.from("colors").select("name,slug").order("name").limit(30),
      client.from("sizes").select("name,slug").order("name").limit(30),
      client
        .from("attributes")
        .select("id,name,slug,is_filterable,sort_order")
        .eq("is_filterable", true)
        .order("sort_order", { ascending: true })
        .limit(40),
      client
        .from("attribute_options")
        .select("id,attribute_id,value,slug,sort_order")
        .order("sort_order", { ascending: true })
        .limit(500),
    ]);

    const skip = new Set(["color", "size"]);
    const optionsByAttr = new Map<string, { id: string; value: string; slug: string }[]>();
    for (const o of opts.data ?? []) {
      const aid = String((o as { attribute_id: string }).attribute_id);
      const list = optionsByAttr.get(aid) ?? [];
      list.push({
        id: String((o as { id: string }).id),
        value: String((o as { value: string }).value),
        slug: String((o as { slug?: string }).slug || (o as { value: string }).value),
      });
      optionsByAttr.set(aid, list);
    }

    const attributes = (attrs.data ?? [])
      .filter((a) => !skip.has(String((a as { slug: string }).slug || "").toLowerCase()))
      .map((a) => {
        const id = String((a as { id: string }).id);
        return {
          id,
          name: String((a as { name: string }).name),
          slug: String((a as { slug: string }).slug),
          options: optionsByAttr.get(id) ?? [],
        };
      })
      .filter((a) => a.options.length > 0);

    return NextResponse.json(
      {
        categories: cats.data ?? [],
        brands: filterBlockedBrands(
          (brands.data ?? []) as { name?: string; slug?: string }[],
        ),
        colors: colors.data ?? [],
        sizes: sizes.data ?? [],
        attributes,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
        },
      },
    );
  } catch (e) {
    console.error("facets", e);
    return NextResponse.json(
      { categories: [], brands: [], colors: [], sizes: [], attributes: [] },
      { status: 200 }
    );
  }
}
