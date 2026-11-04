import { createPublicClient } from "@/lib/supabase/public";

export type RelatedPostCard = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_url: string | null;
};

export async function getRelatedPosts(
  postId: string,
  categoryId: string | null | undefined,
  limit = 4,
): Promise<RelatedPostCard[]> {
  try {
    const supabase = createPublicClient();
    let q = supabase
      .from("blog_posts")
      .select("id, title, slug, excerpt, cover_url")
      .eq("status", "published")
      .neq("id", postId)
      .order("published_at", { ascending: false })
      .limit(limit);
    if (categoryId) q = q.eq("category_id", categoryId);
    const { data, error } = await q;
    if (error) throw error;
    return (data as RelatedPostCard[]) ?? [];
  } catch (e) {
    console.error("[getRelatedPosts]", e);
    return [];
  }
}
