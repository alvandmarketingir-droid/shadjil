import { NextResponse } from "next/server";

const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://shadjil.ir").replace(/\/$/, "");

export function GET() {
  const body = `# شادجیل
> فروشگاه تخصصی شادجیل، ،  و سوغات

## صفحات اصلی
- [خانه](${site}/)
- [محصولات](${site}/products)
- [دسته‌بندی‌ها](${site}/categories)
- [برچسبها](${site}/brands)
- [بلاگ](${site}/blog)
- [تماس](${site}/contact)
- [درباره ما](${site}/about)
- [سوالات متداول](${site}/faq)

## قوانین
- [قوانین و مقررات](${site}/terms)
- [حریم خصوصی](${site}/privacy)
- [شرایط ارسال](${site}/shipping)
- [مرجوعی](${site}/returns)

## نقشه سایت
- [sitemap.xml](${site}/sitemap.xml)
`;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
