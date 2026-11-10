import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { faqPageSchema } from "@/lib/seo/schema";
import { getFaqContentAction } from "@/app/admin/actions/content-pages";
import { FaqView } from "@/components/content/faq-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "سوالات متداول | شادجیل",
  description: "پاسخ به سوالات رایج درباره سفارش، وزن، ارسال و مرجوعی",
};

export default async function FaqPage() {
  const items = await getFaqContentAction();
  return (
    <main className="mx-auto w-full max-w-none px-4 py-8 md:py-12" dir="rtl">
      <h1 className="mb-2 text-center text-2xl font-bold text-primary md:text-3xl">
        سوالات متداول
      </h1>
      <JsonLd data={faqPageSchema(items)} />
      <FaqView items={items} />
    </main>
  );
}
