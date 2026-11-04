"use client";

import Link from "next/link";
import ClothingRailHero from "@/components/ui/product-rail-gallery";
import type { RailGarment } from "@/components/ui/product-rail-gallery";

const RAIL_ITEMS: RailGarment[] = [
  {
    id: "shirt-white",
    name: "پیراهن رسمی سفید",
    kind: "shirt",
    color: "#F4F1EA",
    trim: "#2a2a2a",
    tag: "رسمی",
    description: "پیراهن کلاسیک روزمره و رسمی با برش تمیز.",
    details: ["نخی", "یقه کلاسیک", "آستین بلند"],
  },
  {
    id: "shirt-sky",
    name: "پیراهن آبی آسمانی",
    kind: "shirt",
    color: "#9EC9E0",
    trim: "#1e3a4c",
    tag: "کژوال",
    description: "آبی ملایم برای استایل روز و محل کار.",
    details: ["اکسفورد", "دکمه پایین"],
  },
  {
    id: "tee-bone",
    name: "تی‌شرت استخوانی",
    kind: "tee",
    color: "#EDE8DF",
    trim: "#444",
    tag: "بیسیک",
    description: "تی‌شرت ضخیم برای لایه‌بندی زیر پیراهن.",
    details: ["پنبه‌ای", "فیت معمولی"],
  },
  {
    id: "shirt-navy",
    name: "پیراهن سرمه‌ای",
    kind: "shirt",
    color: "#1B2A4A",
    trim: "#c9a227",
    tag: "رسمی",
    description: "سرمه‌ای تیره با جزئیات ظریف.",
    details: ["نخی", "یقه فرنچ"],
  },
  {
    id: "knit-olive",
    name: "بافت زیتونی",
    kind: "knit",
    color: "#6E7A4E",
    trim: "#2c2c2c",
    tag: "پاییزه",
    description: "لایه میانی گرم برای فصل خنک.",
    details: ["بافت", "یقه هفت"],
  },
  {
    id: "shirt-light",
    name: "پیراهن روشن اداری",
    kind: "shirt",
    color: "#E8EEF5",
    trim: "#3d4f66",
    tag: "اداری",
    description: "انتخاب مطمئن برای محیط کار.",
    details: ["نخی", "آسان‌اتو"],
  },
];

export function HomeClothingRail() {
  return (
    <section aria-label="ریل لباس" className="overflow-hidden rounded-3xl border bg-card">
      <ClothingRailHero
        items={RAIL_ITEMS}
        hanger="wood"
        autoplay
        interval={2800}
        labels={{
          front: "جلو",
          back: "پشت",
          close: "بستن",
          show: "نمایش",
        }}
        eyebrow="انتخاب سردبیر"
        heading="روی ریل این هفته"
        caption="روی هر لباس بکشید یا لمس کنید تا جلو بیاید"
        action={
          <Link
            href="/products"
            className="inline-flex rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background shadow-sm outline-none transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
          >
            مشاهده محصولات
          </Link>
        }
      />
    </section>
  );
}
