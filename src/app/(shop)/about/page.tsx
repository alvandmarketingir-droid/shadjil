import type { Metadata } from "next";
import { About3 } from "@/components/ui/about-3";

export const metadata: Metadata = {
  title: "درباره ما | شادجیل",
  description:
    "فروشگاه تخصصی شادجیل — کیفیت دوخت، راهنمای مناسبت‌ها بسته‌بندی شفاف و پشتیبانی واقعی",
};

export default function AboutPage() {
  return (
    <About3
      title="درباره شادجیل"
      description="ما روی یک چیز تمرکز کرده‌ایم: شادجیل با فیت درست، دوخت تمیز و تجربه خرید شفاف. هدفمان این است که قبل از خرید مناسبت‌ها را با اطمینان انتخاب کنید و بعد از خرید پشتیبانی واقعی داشته باشید."
      breakout={{
        src: "/logo.png",
        alt: "شادجیل",
        title: "اندازه درست، استایل درست",
        description:
          "راهنمای مناسبت‌ها بسته‌بندی شفاف، تعویض آسان و پشتیبانی واقعی — برای اطمینان از فیت قبل و بعد از خرید.",
        buttonText: "مشاهده محصولات",
        buttonUrl: "/products",
      }}
      companiesTitle="تمرکز ما"
      companies={[]}
      achievementsTitle="آنچه برای شما می‌سازیم"
      achievementsDescription="فروشگاه تخصصی، نه همه‌چیزفروشی."
      achievements={[
        { label: "تمرکز", value: "آجیل" },
        { label: "فیت", value: "دقیق" },
        { label: "مرجوعی", value: "آسان" },
        { label: "پشتیبانی", value: "واقعی" },
      ]}
    />
  );
}
