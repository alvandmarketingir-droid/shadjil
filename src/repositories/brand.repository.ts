import { BaseRepository } from "./base.repository";
import type { Brand } from "@/types/database";
import { filterBlockedBrands, isBlockedBrand } from "@/lib/brands/blocked";

type PublicBrand = Pick<
  Brand,
  "id" | "name" | "slug" | "logo_url" | "description" | "is_active"
>;

export class BrandRepository extends BaseRepository {
  async findAllActive() {
    const client = await this.getClient();

    const { data, error } = await client
      .from("brands")
      .select("id, name, slug, logo_url, description, is_active, meta_title, meta_description, focus_keyphrases, og_title, og_description, robots_index, robots_follow, canonical_url")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;
    return filterBlockedBrands((data ?? []) as PublicBrand[]);
  }

  async findBySlug(slug: string) {
    if (isBlockedBrand({ slug, name: slug })) return null;

    const client = await this.getClient();

    const { data, error } = await client
      .from("brands")
      .select("id, name, slug, logo_url, description, is_active, meta_title, meta_description, focus_keyphrases, og_title, og_description, robots_index, robots_follow, canonical_url")
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    const brand = data as PublicBrand;
    if (isBlockedBrand(brand)) return null;
    return brand;
  }
}
