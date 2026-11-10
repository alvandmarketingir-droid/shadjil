export const PREDEFINED_NOTIFICATIONS = [
  {
    id: "welcome",
    title: "خوش آمدید",
    body: "به فروشگاه شادجیل خوش آمدید. از خریدتان سپاسگزاریم.",
    type: "system",
  },
  {
    id: "order_placed",
    title: "سفارش شما ثبت شد",
    body: "سفارش شما با موفقیت ثبت شد و به‌زودی بررسی می‌شود.",
    type: "order",
  },
  {
    id: "order_processing",
    title: "سفارش در حال آماده‌سازی",
    body: "سفارش شما تأیید شد و در حال آماده‌سازی برای ارسال است.",
    type: "order",
  },
  {
    id: "order_shipped",
    title: "سفارش ارسال شد",
    body: "سفارش شما ارسال شد و به‌زودی به دستتان می‌رسد.",
    type: "order",
  },
  {
    id: "order_delivered",
    title: "سفارش تحویل داده شد",
    body: "سفارش شما با موفقیت تحویل داده شد. از خریدتان سپاسگزاریم.",
    type: "order",
  },
  {
    id: "order_cancelled",
    title: "سفارش لغو شد",
    body: "سفارش شما لغو شد. در صورت نیاز با پشتیبانی تماس بگیرید.",
    type: "order",
  },
  {
    id: "promo",
    title: "پیشنهاد ویژه",
    body: "تخفیف محدود روی محصولات منتخب — همین حالا در فروشگاه ببینید.",
    type: "promo",
  },
  {
    id: "support_reply",
    title: "پاسخ پشتیبانی",
    body: "به تیکت شما پاسخ داده شد. از پنل مشتری بخش پشتیبانی را باز کنید.",
    type: "support",
  },
] as const;
