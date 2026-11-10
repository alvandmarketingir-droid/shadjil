import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPostBySlugAction } from "@/app/(shop)/actions/blog-public";
import { formatJalaliDate } from "@/lib/dates/jalali";
import { JsonLd } from "@/components/seo/json-ld";
import { articleSchema, breadcrumbSchema } from "@/lib/seo/schema";
import { applySeoTemplate } from "@/lib/seo/template";

export const revalidate = 60;


type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const res = await getPublishedPostBySlugAction(slug);
  if (!res.ok || !res.post) return { title: "مقاله" };
  const p = res.post as {
    title: string;
    excerpt: string | null;
    meta_title?: string | null;
    meta_description?: string | null;
    og_title?: string | null;
    og_description?: string | null;
    og_image_url?: string | null;
    robots_index?: boolean | null;
    robots_follow?: boolean | null;
    canonical_url?: string | null;
    cover_url?: string | null;
  };
  const tplCtx = { name: p.title, title: p.title, description: p.excerpt || undefined };
  const title = applySeoTemplate(p.meta_title, tplCtx) || p.title;
  const description =
    applySeoTemplate(p.meta_description, tplCtx) || p.excerpt || undefined;
  return {
    title,
    description,
    alternates: p.canonical_url ? { canonical: p.canonical_url } : undefined,
    robots: {
      index: p.robots_index !== false,
      follow: p.robots_follow !== false,
    },
    openGraph: {
      title: p.og_title || title,
      description: p.og_description || description,
      images: (p.og_image_url || p.cover_url) ? [{ url: (p.og_image_url || p.cover_url)! }] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const res = await getPublishedPostBySlugAction(slug);
  if (!res.ok || !res.post) notFound();

  const post = res.post as {
    title: string;
    body: string | null;
    excerpt: string | null;
    cover_url: string | null;
    published_at: string | null;
    category?: { name: string } | null;
  };

  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://shadjil.ir").replace(/\/$/, "");
  return (
    <article className="w-full max-w-none space-y-6 p-6" dir="rtl">
      <JsonLd
        data={[
          articleSchema({
            title: post.title,
            slug,
            description: post.excerpt,
            image: post.cover_url,
            datePublished: post.published_at,
          }),
          breadcrumbSchema([
            { name: "خانه", url: siteBase + "/" },
            { name: "بلاگ", url: siteBase + "/blog" },
            { name: post.title, url: siteBase + "/blog/" + slug },
          ]),
        ]}
      />
      <Link href="/blog" className="text-primary text-sm underline">
        ← بازگشت به بلاگ
      </Link>
      {post.category?.name ? (
        <p className="text-muted-foreground text-xs">{post.category.name}</p>
      ) : null}
      <h1 className="text-3xl font-bold leading-snug text-primary">{post.title}</h1>
      {post.published_at ? (
        <time className="text-muted-foreground text-sm">
          {formatJalaliDate(post.published_at)}
        </time>
      ) : null}
      {post.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.cover_url}
          alt=""
          className="border-border w-full rounded-2xl border object-cover"
        />
      ) : null}
      {post.excerpt ? (
        <p className="text-muted-foreground text-base">{post.excerpt}</p>
      ) : null}
      <div className="prose prose-neutral dark:prose-invert max-w-none whitespace-pre-wrap text-base leading-8">
        {post.body || ""}
      </div>
    </article>
  );
}
