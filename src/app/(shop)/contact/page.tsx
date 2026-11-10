import { getStoreContact } from "@/lib/store-contact";
import { toPersianDigits } from "@/lib/numbers";
import type { Metadata } from "next";
import ContactWithGlobe from "@/components/ui/contact-with-globe";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "تماس با ما | شادجیل",
  description: "راه‌های ارتباط با فروشگاه تخصصی شادجیل",
};

export default async function ContactPage() {
  const support = await getStoreContact();

  return (
    <>
      {(support.phone || support.email) ? (
        <div
          className="border-border bg-muted/30 mx-auto mb-2 mt-4 max-w-3xl rounded-xl border p-4 text-sm"
          dir="rtl"
        >
          <p className="font-medium text-primary">راه‌های ارتباطی</p>
          {support.phone ? (
            <p className="mt-1">
              تلفن:{" "}
              <a
                className="underline"
                dir="ltr"
                href={`tel:${support.phone.replace(/\s/g, "")}`}
              >
                {toPersianDigits(support.phone)}
              </a>
            </p>
          ) : null}
          {support.email ? (
            <p className="mt-1">
              ایمیل:{" "}
              <a className="underline" dir="ltr" href={`mailto:${support.email}`}>
                {support.email}
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      <ContactWithGlobe
        subtitle="تماس"
        title="تماس با ما"
        description="برای پشتیبانی سفارش، مرجوعی و مشاوره خرید از راه‌های زیر با ما در ارتباط باشید."
      />
    </>
  );
}
