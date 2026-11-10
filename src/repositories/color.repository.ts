import { BaseRepository } from "./base.repository";

export type ColorRow = {
  id: string;
  name: string;
  slug: string;
  hex: string | null;
};

export class ColorRepository extends BaseRepository {
  async findAllActive(): Promise<ColorRow[]> {
    const { data, error } = await (await this.getClient())
      .from("roasts")
      .select("id, name, slug, hex_code, sort_order")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      slug: r.slug as string,
      hex: (r.hex_code as string | null) ?? null,
    }));
  }

  async findBySlug(slug: string): Promise<ColorRow | null> {
    const { data, error } = await (await this.getClient())
      .from("roasts")
      .select("id, name, slug, hex_code")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id as string,
      name: data.name as string,
      slug: data.slug as string,
      hex: (data.hex_code as string | null) ?? null,
    };
  }
}
