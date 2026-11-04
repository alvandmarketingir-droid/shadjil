"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Home,
  Package,
  ShoppingCart,
  Users,
  Tag,
  Settings,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  FolderTree,
  FileText,
  MessageSquare,
  Ticket,
  Bell,
  Database,
  Percent,
  Menu,
  X,
  Activity,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/dashboard", label: "داشبورد", icon: Home },
  { href: "/admin/orders", label: "سفارش‌ها", icon: ShoppingCart },
  { href: "/admin/products", label: "محصولات", icon: Package },
  { href: "/admin/categories", label: "دسته‌ها", icon: FolderTree },
  { href: "/admin/brands", label: "برندها", icon: Package },
  { href: "/admin/attributes", label: "مشخصات", icon: Tag },
  { href: "/admin/tags", label: "برچسب‌ها", icon: Tag },
  { href: "/admin/discounts", label: "تخفیف‌ها", icon: Tag },
  { href: "/admin/flash-sale", label: "شگفت‌انگیز", icon: Percent },
  { href: "/admin/users", label: "کاربران", icon: Users },
  { href: "/admin/club", label: "باشگاه مشتریان", icon: Users },
  { href: "/admin/media", label: "رسانه", icon: ImageIcon },
  { href: "/admin/blog", label: "بلاگ", icon: FileText },
  { href: "/admin/reviews", label: "نظرات", icon: MessageSquare },
  { href: "/admin/tickets", label: "تیکت‌ها", icon: Ticket },
  { href: "/admin/contact-messages", label: "پیام‌های تماس", icon: MessageSquare },
  { href: "/admin/notifications", label: "اعلان‌ها", icon: Bell },
  { href: "/admin/shipping", label: "ارسال", icon: Package },
  { href: "/admin/returns", label: "مرجوعی", icon: Package },
  { href: "/admin/stock-alerts", label: "لیست انتظار موجودی", icon: Bell },
  { href: "/admin/reports", label: "گزارش فروش", icon: FileSpreadsheet },
  { href: "/admin/analytics", label: "آمار", icon: BarChart3 },
  { href: "/admin/health", label: "سلامت سیستم", icon: Activity },
  { href: "/admin/seo", label: "سئو", icon: FileText },
  { href: "/admin/seo/redirects", label: "ریدایرکت‌ها", icon: FileText },
  { href: "/admin/logs", label: "لاگ‌ها", icon: FileText },
  { href: "/admin/pages", label: "محتوای صفحات", icon: FileText },
  { href: "/admin/settings", label: "تنظیمات", icon: Settings },
  { href: "/admin/backup", label: "بک‌آپ", icon: Database },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function NavLinks({ compact = false }: { compact?: boolean }) {
    return (
      <>
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileNavOpen(false)}
              className={cn(
                "flex items-center rounded-lg text-sm transition-colors",
                compact
                  ? // حدود ۳.۵ تب در عرض موبایل + فاصله یکنواخت
                    "w-[calc((100%-18px)/3.5)] min-w-[calc((100%-18px)/3.5)] shrink-0 justify-center gap-1 px-1.5 py-2"
                  : "gap-3 px-3 py-2.5",
                active
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {(open || compact) ? (
                <span className={cn(compact && "truncate text-[12px] leading-tight")}>
                  {item.label}
                </span>
              ) : null}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <div
      className="bg-background text-foreground flex min-h-screen flex-col lg:flex-row"
      dir="rtl"
    >
      {/* —— موبایل/تبلت: نوار بالا + منوی افقی/بازشونده —— */}
      <div className="border-border sticky top-0 z-40 border-b bg-background lg:hidden">
        <div className="flex items-center justify-between gap-2 p-3">
          <span className="text-sm font-bold">CMS مدیریت</span>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-muted-foreground text-xs">
              فروشگاه
            </Link>
            <button
              type="button"
              className="border-border inline-flex h-9 w-9 items-center justify-center rounded-lg border"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="منو"
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {/* اسکرول افقی سریع */}
        <nav
          className="flex gap-1.5 overflow-x-auto px-3 pb-2 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          dir="rtl"
        >
          <NavLinks compact />
        </nav>
        {/* منوی کامل بازشونده */}
        {mobileNavOpen ? (
          <nav className="border-border max-h-[50vh] space-y-0.5 overflow-y-auto border-t p-2">
            <NavLinks />
          </nav>
        ) : null}
      </div>

      {/* —— دسکتاپ: سایدبار کنار —— */}
      <aside
        className={cn(
          "border-border sticky top-0 hidden h-screen shrink-0 flex-col border-l transition-all lg:flex",
          open ? "w-60" : "w-16",
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b p-3">
          {open ? <span className="text-sm font-bold">CMS مدیریت</span> : null}
          <button
            type="button"
            className="border-border inline-flex h-9 w-9 items-center justify-center rounded-lg border"
            onClick={() => setOpen((v) => !v)}
            aria-label="جمع‌کردن منو"
          >
            {open ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          <NavLinks />
        </nav>
        <div className="border-border border-t p-2">
          <Link
            href="/"
            className="text-muted-foreground hover:bg-muted block rounded-lg px-3 py-2 text-xs"
          >
            {open ? "← بازگشت به فروشگاه" : "←"}
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">
        <div className="min-h-[50vh] px-3 py-3 sm:px-4 sm:py-4 md:px-6">
          {children}
        </div>
      </main>
    </div>
  );
}
