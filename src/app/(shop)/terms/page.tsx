import type { Metadata } from "next";
import { getTextPageContentAction } from "@/app/admin/actions/content-pages";
import { LegalView } from "@/components/content/legal-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "شرایط استفاده | شادجیل",
  description: "شرایط و قوانین استفاده از فروشگاه شادجیل",
};

export default async function TermsPage() {
  const content = await getTextPageContentAction("terms");
  return (
    <main className="px-4 py-8 md:py-12">
      <LegalView content={content} variant="terms" />
    </main>
  );
}
