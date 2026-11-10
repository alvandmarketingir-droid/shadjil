# امنیت شادجیل

## انجام‌شده در کد (کامل)

- **Rate Limiting توزیع‌شده با Upstash** روی contact + آماده برای auth/API
  - fallback حافظه‌ای وقتی Upstash تنظیم نباشد
- Security headers قوی در middleware + next.config (CSP, HSTS, X-Frame-Options و ...)
- Health check کامل: `/api/health` (Supabase + RateLimit + R2 + Sentry + Cron)
- بک‌آپ روزانه: `/api/cron/backup` → R2 (نیاز به `CRON_SECRET`)
- RLS hardening: `supabase/migrations/030_rls_hardening.sql`
- Gitleaks secret scanning
- Edge cache برای APIهای عمومی
- Region: Vercel `fra1` (نزدیک به کاربر ایران/اروپا)
- Sentry (client + server + edge)

## کارهای دستی (یک‌بار — حتماً انجام بده)

1. در **Supabase → SQL Editor** محتوای فایل `supabase/migrations/030_rls_hardening.sql` را اجرا کنید.
2. در **Supabase → Authentication → URL Configuration** دامنه `https://shadjil.ir` را مجاز کنید.
3. متغیرهای زیر را فقط در **Vercel → Settings → Environment Variables** (server-side) بگذارید:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` / `R2_PUBLIC_BASE_URL`
   - `CRON_SECRET`
   - `NEXT_PUBLIC_SENTRY_DSN` (این یکی public است)
4. در **Cloudflare**:
   - SSL/TLS → Full (strict)
   - Always Use HTTPS → On
   - در صورت نیاز Bot Fight Mode یا Rate Limiting اضافی

## Load Balancing & Scaling
- Vercel خودکار ترافیک را بین edge/serverless اسکیل می‌کند.
- Region ثابت `fra1` در `vercel.json`.
- پیشنهاد: در Supabase حالت Transaction mode برای connection pooling فعال باشد.

## تست سریع

```bash
# Health
curl -s https://shadjil.ir/api/health | jq

# Rate limit contact (باید بعد از چند درخواست 429 بدهد)
curl -X POST https://shadjil.ir/api/contact \\
  -H "Content-Type: application/json" \\
  -d '{"name":"test","email":"a@b.com","message":"hi"}'
