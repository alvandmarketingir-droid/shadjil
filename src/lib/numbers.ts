/** ارقام فارسی/عربی ↔ لاتین + موبایل ایران + پارس عدد */

const FA_AR_TO_EN: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

const EN_TO_FA: Record<string, string> = {
  "0": "۰", "1": "۱", "2": "۲", "3": "۳", "4": "۴",
  "5": "۵", "6": "۶", "7": "۷", "8": "۸", "9": "۹",
};

export function toEnglishDigits(input: string): string {
  return String(input ?? "").replace(/[۰-۹٠-٩]/g, (ch) => FA_AR_TO_EN[ch] ?? ch);
}

export function toPersianDigits(value: string | number): string {
  return String(value ?? "").replace(/[0-9]/g, (ch) => EN_TO_FA[ch] ?? ch);
}

export function digitsOnly(input: string): string {
  return toEnglishDigits(input).replace(/\D/g, "");
}

/** نرمال موبایل ایران → 09xxxxxxxxx (همیشه رشته؛ ممکن است نامعتبر باشد) */
export function normalizePhone(input: string): string {
  let phone = toEnglishDigits(input).replace(/[\s\-()]/g, "");
  if (phone.startsWith("+98")) phone = "0" + phone.slice(3);
  if (phone.startsWith("0098")) phone = "0" + phone.slice(4);
  if (phone.startsWith("98") && phone.length >= 12) phone = "0" + phone.slice(2);
  if (phone.startsWith("9") && phone.length === 10) phone = "0" + phone;
  return phone;
}

export function isValidIranianPhone(input: string): boolean {
  return /^09\d{9}$/.test(normalizePhone(input));
}

/** null اگر نامعتبر */
export function normalizeIranMobile(input: string): string | null {
  const phone = normalizePhone(input);
  return /^09\d{9}$/.test(phone) ? phone : null;
}

export function isValidIranMobile(input: string): boolean {
  return normalizeIranMobile(input) !== null;
}

/** همه شکل‌های رایج ذخیره‌سازی موبایل در DB / Auth برای lookup */
export function phoneLookupVariants(phone09: string): string[] {
  const phone = normalizeIranMobile(phone09);
  if (!phone) return [];
  const national = phone.slice(1); // 9xxxxxxxxx
  return Array.from(
    new Set([
      phone,
      `+98${national}`,
      `98${national}`,
      national,
      `0098${national}`,
      `0${national}`,
    ]),
  );
}

/** ایمیل سنتتیک مسیر OTP — همیشه بر پایه 09… */
export function otpPhoneEmail(phone: string): string {
  const normalized =
    normalizeIranMobile(phone) ??
    (() => {
      const d = digitsOnly(phone);
      return d.length === 10 && d.startsWith("9") ? `0${d}` : d;
    })();
  return `${digitsOnly(normalized)}@phone.pirahanmardane.ir`;
}

/** کد پستی ایران: ۱۰ رقم */
export function normalizeIranPostalCode(input: string): string | null {
  const d = toEnglishDigits(String(input ?? "")).replace(/\D/g, "");
  return /^\d{10}$/.test(d) ? d : null;
}

export function isValidIranPostalCode(input: string): boolean {
  return normalizeIranPostalCode(input) !== null;
}


/** عدد از رشته با ارقام فارسی/عربی و جداکننده */
export function parseLocaleNumber(input: string): number | null {
  const n = toEnglishDigits(String(input ?? ""))
    .replace(/,/g, "")
    .replace(/[^\d.-]/g, "")
    .trim();
  if (!n || n === "-" || n === ".") return null;
  const num = Number(n);
  return Number.isFinite(num) ? num : null;
}

/** فقط رقم؛ فارسی هم قبول می‌شود */
export function onlyDigits(input: string, maxLen?: number): string {
  let s = toEnglishDigits(input).replace(/\D/g, "");
  if (maxLen != null) s = s.slice(0, maxLen);
  return s;
}

