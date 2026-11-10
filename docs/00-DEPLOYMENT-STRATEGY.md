# Deployment Strategy — شادجیل

نسخه: ۱.۰ | ۲۰۲۶-۱۰-۲۰

## محیط‌ها
| محیط | شاخه | میزبان | دامنه |
|------|------|--------|--------|
| Production | main | Vercel fra1 | https://shadjil.ir |
| Preview | هر PR / شاخه | Vercel Preview | *.vercel.app |
| Staging جدا | فعلاً نیست | — | عمداً بعد از محتوای واقعی |

## جریان استاندارد
1. تغییر محلی روی `main` (کوچک) یا `feat/*` سپس merge
2. `git push` → Vercel خودکار build
3. Smoke دستی: /api/health + یک صفحه فروشگاه + یک صفحه ادمین
4. در صورت شکست build: fix و push مجدد؛ rollback از داشبورد Vercel به deploy قبلی

## Migration دیتابیس
1. فایل جدید در `supabase/migrations/`
2. در Supabase SQL Editor اجرا (یا CLI)
3. هرگز migration را فقط در کد نگذار بدون اجرا روی production
4. Rollback: migration معکوس دستی + redeploy کد سازگار

## Env
- منبع حقیقت: Vercel Project Settings
- الگوی محلی: `.env.example` → `.env.local`
- Service Role / R2 / Upstash / CRON_SECRET فقط server

## Cron
- `/api/cron/backup` روزانه (vercel.json) با هدر `CRON_SECRET`

## ایندکس گوگل
- پیش‌فرض: noindex تا `NEXT_PUBLIC_ALLOW_INDEX=true` + محتوای واقعی + QA

## Rollback سریع
1. Vercel → Deployments → Promote previous Ready
2. اگر migration مخرب بود: SQL اصلاحی فوری + redeploy

## ممنوع
- force-push روی main بدون هماهنگی
- commit کردن `.env` واقعی
- تغییر RLS بدون تست با anon key
