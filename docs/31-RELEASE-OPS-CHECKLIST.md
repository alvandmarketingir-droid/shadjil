# چک‌لیست رسمی: Staging → QA → Backup → Smoke → Monitor

سایت: https://shadjil.ir
علامت: [x] پاس | [ ] باز | [N/A] رد/غیرکاربردی

## 1) Staging
- [N/A] محیط staging جدا — عمداً حذف شد
- [x] Production از main

## 2) QA (docs/30-QA-CHECKLIST.md)
- [x] چک‌لیست Formal موجود
- [x] npm test 47/47 — 2026-10-25
- [x] security-smoke PASS — 2026-10-25
- [N/A] e2e لوکال (mac12)
- [x] Functional/UI دستی مالک — 2026-10-25

## 3) Backup
- [x] Cron /api/cron/backup روزانه 03:00 UTC
- [x] CRON_SECRET در health = ok
- [x] تأیید یک اجرای موفق (curl با secret) — 2026-10-25 · http=200 · ok=true
- [x] تأیید وجود فایل/خروجی قابل بازیابی — key=`backups/db/2026-10-25T20-02-20-766Z.json` · bytes≈86344 · tables=23 · errors=[]
- [x] سیاست نگه‌داری — اشیاء `backups/db/*.json` + `backups/db/latest.json` در R2؛ پاکسازی خودکار تعریف‌نشده (نگه دستی تا تصمیم مالک)

## 4) Smoke (بعد دیپلوی)
- [x] /api/health ok
- [x] security-smoke
- [x] خانه 200 در مرورگر — 2026-10-25
- [x] مسیر اصلی فروشگاه دستی (محصول + سبد) — 2026-10-25

## 5) Monitor
- [x] /api/health + /status
- [x] Sentry / Upstash / R2 از health
- [ ] Uptime خارجی (UptimeRobot و مشابه) — اختیاری
- [ ] کانال هشدار — اختیاری

## جریان بدون Staging
1. merge به main
2. Vercel Production سبز
3. smoke: health + security-smoke
4. در صورت نیاز QA دستی
5. نگاه به health/Sentry

## موکول عمدی (خارج از ops این چک‌لیست)
- درگاه پرداخت production
- ENV پیامک production

## امضا
| مرحله | نتیجه | تاریخ |
|-------|--------|-------|
| Staging | N/A | 2026-10-25 |
| QA | auto PASS + manual PASS | 2026-10-25 |
| Backup | PASS (manual curl + R2 key) | 2026-10-25 |
| Smoke | PASS | 2026-10-25 |
| Monitor | in-app ok · uptime خارجی باز | 2026-10-25 |
