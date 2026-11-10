import type { Metadata } from "next";
import { listPublishedPostsAction } from "@/app/(shop)/actions/blog-public";
import { LiveBlogList } from "@/components/shop/live-blog-list";
import { metadataFromSeoPage } from "@/lib/seo/page-settings";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return metadataFromSeoPage("blog_plp", {
    title: "بلاگ",
    description: "مقالات فروشگاه شادجیل",
  });
}

export default async function BlogIndexPage() {
  const res = await listPublishedPostsAction();
  const items = (res.items ?? []) as {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    cover_url: string | null;
    published_at: string | null;
    category?: { name: string } | null;
  }[];

  return (
    <main className="w-full max-w-none mx-auto space-y-8 px-4 py-8 md:py-12" dir="rtl">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-iranyekan-heavy text-primary">
          بلاگ
        </h1>
      </div>
      <LiveBlogList initialItems={items} />
    </main>
  );
}
