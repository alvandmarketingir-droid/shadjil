import { BaseRepository } from "./base.repository";

export type SizeRow = {
  id: string;
  name: string;
  slug: string;
};

export class SizeRepository extends BaseRepository {
  async findAllActive(): Promise<SizeRow[]> {
    const { data, error } = await (await this.getClient())
      .from("weights")
      .select("id, name, slug, sort_order")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as SizeRow[];
  }

  async findBySlug(slug: string): Promise<SizeRow | null> {
    const { data, error } = await (await this.getClient())
      .from("weights")
      .select("id, name, slug")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data as SizeRow | null;
  }
}
