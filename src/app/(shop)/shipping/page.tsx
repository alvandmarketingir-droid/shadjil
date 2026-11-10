import type { Metadata } from "next";
import { getTextPageContentAction } from "@/app/admin/actions/content-pages";
import { ShippingView } from "@/components/content/shipping-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ارسال و تحویل | شادجیل",
  description: "روش‌ها و زمان تقریبی ارسال سفارش‌ها",
};

export default async function ShippingPage() {
  const content = await getTextPageContentAction("shipping");
  return (
    <main className="px-4 py-8 md:py-12">
      <ShippingView content={content} />
    </main>
  );
}
