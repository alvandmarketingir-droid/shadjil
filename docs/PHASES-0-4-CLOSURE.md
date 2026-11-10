# بستن رسمی فاز ۰ تا ۴ (پیش‌انتشار)

تاریخ: ۲۰۲۶-۱۰-۰۷  
سطح: Pre-launch / Production-ready skeleton  
وضعیت: آماده برای تأیید نهایی مالک پروژه

## تعریف «تکمیل» در این سند
معنی تکمیل = قابل اتکا برای ادامه فاز ۵ و پیش‌انتشار عمومی محتوا.  
معنی تکمیل ≠ ۱۰۰٪ استاندارد جهانی لانچ نهایی (OTP، تست امنیتی اتوماتیک، Design System سازمانی، درگاه پرداخت).

## فاز ۰ — پایه پروژه
| مورد | وضعیت |
|------|--------|
| Requirements + User Flows | ✅ docs/00-REQUIREMENTS-AND-USER-FLOWS.md |
| Coding Standards | ✅ docs/00-CODING-STANDARDS.md |
| Git Convention | ✅ docs/00-GIT-CONVENTION.md |
| Definition of Done | ✅ docs/00-DEFINITION-OF-DONE.md |

## فاز ۱ — پایه فنی
| مورد | وضعیت |
|------|--------|
| Branch / Workflow | ✅ docs/01-BRANCH-AND-WORKFLOW.md |
| Logging standards | ✅ docs/01-LOGGING.md |
| Health endpoint | ✅ /api/health |

## فاز ۲ — سیستم طراحی (سطح پیش‌انتشار)
| مورد | وضعیت |
|------|--------|
| کامپوننت‌های پایه موجود | ✅ |
| Card اصلی ترمیم شد | ✅ |
| Button به نسخه پایدار برگردانده شد | ✅ |
| بیلد Vercel سبز | ✅ |
| بازنویسی آزمایشی UI متوقف | ✅ |

یادداشت: Design System formal کامل سازمانی عمداً خارج از این بستن است.

## فاز ۳ — دیتابیس (اسکلت)
| جدول | وضعیت |
|------|--------|
| payments | ✅ |
| shipments | ✅ |
| shipping_methods | ✅ + پنل ادمین |
| audit_logs | ✅ |
| webhook_events | ✅ |
| site_settings | ✅ |
| RLS پایه | ✅ |

یادداشت: UI مدیریت پرداخت و reconciliation عمداً بعد از درگاه.

## فاز ۴ — احراز هویت (سطح فعلی)
| مورد | وضعیت |
|------|--------|
| Supabase Auth | ✅ |
| is_admin() + role | ✅ |
| RLS داده حساس | ✅ |
| سند وضعیت | ✅ docs/04-AUTH-STATUS.md |
| OTP / permission ریزدانه | ⏸ عمداً بعداً |

## معیار پذیرش بستن (باید توسط مالک تأیید شود)
- [ ] https://shadjil.ir بالا است
- [ ] https://shadjil.ir/api/health → ok
- [ ] https://shadjil.ir/about بدون «خطا در این بخش»
- [ ] https://shadjil.ir/products لیست می‌دهد
- [ ] https://shadjil.ir/admin/products لیست می‌دهد (با لاگین ادمین)
- [ ] بیلد آخرین commit روی Vercel = Ready

## ضمانت این سند
پس از تیک خوردن همه موارد بالا توسط مالک پروژه، فاز ۰ تا ۴ برای پیش‌انتشار **رسمی بسته** اعلام می‌شود.
