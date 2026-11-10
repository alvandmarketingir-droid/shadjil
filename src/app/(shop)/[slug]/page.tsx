import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryService } from "@/services/category.service";
import { BrandService } from "@/services/brand.service";
import CategoryListingPage, {
  generateMetadata as categoryMeta,
} from "../categories/[slug]/page";
import BrandListingPage, {
  generateMetadata as brandMeta,
} from "../brands/[slug]/page";

export const revalidate = 60;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function decodeSlug(raw: string): string {
  let s = raw;
  for (let i = 0; i < 3; i++) {
    try {
      const d = decodeURIComponent(s);
      if (d === s) break;
      s = d;
    } catch {
      break;
    }
  }
  return s;
}

const RESERVED = new Set([
  "about", "blog", "brands", "cart", "categories", "checkout", "contact",
  "dashboard", "faq", "login", "products", "register", "privacy", "returns",
  "shipping", "weight-guide", "size-guide", "terms", "track", "tag", "wishlist", "compare",
  "api", "admin", "ورود", "ثبت-نام", "علاقه-مندی-ها", "مقایسه", "سبد-خرید", "محصولات",
]);

async function resolvedProps(props: Props): Promise<Props> {
  const raw = (await props.params).slug;
  const slug = decodeSlug(raw);
  return {
    params: Promise.resolve({ slug }),
    searchParams: props.searchParams,
  };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const slug = decodeSlug((await props.params).slug);
  if (RESERVED.has(slug)) return {};

  const fixed = await resolvedProps(props);

  const brandService = new BrandService();
  const brand = await brandService.getBySlug(slug);
  if (brand.success && brand.data) {
    return brandMeta(fixed);
  }

  const categoryService = new CategoryService();
  const cat = await categoryService.getBySlug(slug);
  if (cat.success && cat.data) {
    return categoryMeta(fixed);
  }

  return { title: "یافت نشد" };
}

export default async function RootSlugPage(props: Props) {
  const slug = decodeSlug((await props.params).slug);
  if (RESERVED.has(slug)) notFound();

  const fixed = await resolvedProps(props);

  // برچسب را اول چک کن تا با اسلاگ مشترک دسته تداخل کمتر شود
  const brandService = new BrandService();
  const brand = await brandService.getBySlug(slug);
  if (brand.success && brand.data) {
    return BrandListingPage(fixed);
  }

  const categoryService = new CategoryService();
  const cat = await categoryService.getBySlug(slug);
  if (cat.success && cat.data) {
    return CategoryListingPage(fixed);
  }

  notFound();
}
