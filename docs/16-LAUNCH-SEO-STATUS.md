# فاز ۱۶ — آماده‌سازی لانچ و زیرساخت SEO

وضعیت: **زیرساخت کامل — ایندکس هنوز خاموش**

تاریخ: ۲۰۲۶-۱۰-۱۸

## تصمیم مالک
- سایت **فعلاً noindex** می‌ماند
- زیرساخت SEO برای روز لانچ تکمیل شود

## انجام‌شده
- [x] `robots.ts` — تا `NEXT_PUBLIC_ALLOW_INDEX=true` کل سایت `disallow: /`
- [x] `sitemap.ts` — ساختار کامل (محصول، دسته، برند، بلاگ، صفحات ثابت)؛ تا ایندکس خاموش خروجی خالی
- [x] Metadata ریشه: title template، description، keywords، Open Graph، Twitter
- [x] JSON-LD سازمان + وب‌سایت
- [x] JSON-LD محصول + breadcrumb در PDP
- [x] canonical پیش‌فرض برای محصول
- [x] قفل سراسری: حتی تنظیمات per-page ادمین تا فلگ خاموش، index نمی‌شود
- [x] پنل ادمین SEO (از قبل)
- [x] favicon / manifest / theme-color

## برای روز لانچ عمومی (دستی مالک)
1. در Vercel: `NEXT_PUBLIC_ALLOW_INDEX=true`
2. Redeploy
3. Search Console: دامنه + ارسال sitemap `https://shadjil.ir/sitemap.xml`
4. بررسی `robots.txt` و یک صفحه محصول در Rich Results Test

## خارج از محدوده این فاز
- ایندکس واقعی گوگل (عمداً خاموش)
- بک‌لینک و کمپین محتوا
- کاتالوگ کامل محصولات واقعی (عملیاتی)

## تأیید
- مالک: noindex بماند + زیرساخت SEO فاز ۱۶
