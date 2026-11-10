import type { Metadata } from "next";
import { getTextPageContentAction } from "@/app/admin/actions/content-pages";
import { LegalView } from "@/components/content/legal-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "حریم خصوصی | شادجیل",
  description: "نحوه جمع‌آوری و استفاده از اطلاعات کاربران",
};

export default async function PrivacyPage() {
  const content = await getTextPageContentAction("privacy");
  return (
    <main className="px-4 py-8 md:py-12">
      <LegalView content={content} variant="privacy" />
    </main>
  );
}
