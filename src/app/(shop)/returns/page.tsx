import type { Metadata } from "next";
import { getTextPageContentAction } from "@/app/admin/actions/content-pages";
import { ReturnsView } from "@/components/content/returns-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "سیاست مرجوعی | شادجیل",
  description: "شرایط بازگرداندن و تعویض کالا",
};

export default async function ReturnsPolicyPage() {
  const content = await getTextPageContentAction("returns");
  return (
    <main className="px-4 py-8 md:py-12">
      <ReturnsView content={content} />
    </main>
  );
}
