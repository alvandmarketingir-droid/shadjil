# قرارداد Git — شادجیل

## Branch Strategy

| برنچ | کاربرد |
|------|--------|
| `main` | تولید؛ هر push → دیپلوی Vercel |
| `feat/<موضوع>` | قابلیت جدید |
| `fix/<موضوع>` | رفع باگ |
| `chore/<موضوع>` | نگهداری، docs، وابستگی |
| `hotfix/<موضوع>` | رفع فوری روی production |

قوانین:
- مستقیم روی `main` فقط برای تغییر کوچک و امن (docs جزئی، typo)
- قابلیت بزرگ از برنچ جدا و با PR
- نام برنچ انگلیسی، کوتاه، با `-` (مثال: `feat/shipping-quote`)

## Commit Convention

فرمت: `type(scope): summary کوتاه انگلیسی`

typeهای مجاز:
- `feat` — قابلیت جدید
- `fix` — رفع باگ
- `docs` — فقط مستندات
- `chore` — نگهداری / تنظیمات
- `refactor` — بازنویسی بدون تغییر رفتار
- `test` — تست
- `perf` — بهبود عملکرد
- `security` — امنیت

مثال:
- `feat(phase-3): audit_logs and shipment_events`
- `fix(contact): repair JSX syntax`
- `docs(phase-0): testing and deployment strategy`

## ممنوع

- commit کردن `.env` واقعی و کلیدها
- force-push روی `main` بدون هماهنگی
- پیام commit مبهم مثل `update` یا `wip`

مکمل گردش کار: `docs/01-BRANCH-AND-WORKFLOW.md`
Definition of Done جدا است: `docs/00-DEFINITION-OF-DONE.md`
