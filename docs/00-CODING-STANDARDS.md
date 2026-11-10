# استاندارد کدنویسی — شادجیل

## اصول
- TypeScript strict؛ از `any` فقط با دلیل و محدود
- App Router؛ منطق حساس فقط در Server Actions / Route Handlers
- Service Role فقط سمت سرور (`createServiceClient`)
- متن کاربر را sanitize کن (لینک/تصویر ناخواسته)

## ساختار پوشه‌ها
- `src/app/(shop)` — فروشگاه
- `src/app/admin` — پنل ادمین
- `src/app/api` — API عمومی/کرون
- `src/lib` — منطق مشترک (shipping، supabase، dates، …)
- `src/components` — UI
- `supabase/migrations` — تغییرات دیتابیس
- `docs` — مستندات پروژه

## نام‌گذاری
- کامپوننت: PascalCase (`ProductCard.tsx`)
- هوک: `use-*.ts`
- اکشن سرور: `*Action` در فایل `actions.ts`
- ثابت/نوع: واضح و دامنهی (`ShipMethod`, `QuoteResult`)

## UI / RTL
- همه صفحات فروشگاه `dir="rtl"`
- قیمت و عدد با ابزار فارسی پروژه (`Price`, `toPersianDigits`)
- تاریخ با جلالی (`formatJalaliDate*`)

## داده و امنیت
- هر جدول حساس باید RLS داشته باشد
- ورودی کاربر validate شود
- خطاهای کاربر پیام فارسی؛ جزئیات فنی فقط در لاگ/Sentry

## Git و PR
- طبق `docs/00-GIT-CONVENTION.md`
- PR بدون توضیح و تست دستی مربوطه merge نشود

## تست (حداقلی فعلاً)
- منطق قیمت/ارسال/تخفیف در صورت تغییر، تست واحد ترجیحاً اضافه شود
- مسیر خرید بعد از تغییر چک‌اوت/سفارش دستی تست شود
