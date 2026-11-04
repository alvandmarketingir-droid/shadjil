"use client";
import { useState } from "react";
import { Home, ShoppingCart, Users, Settings, ChevronLeft, ChevronRight, Package, BarChart3 } from "lucide-react";

type Props = { isAdmin?: boolean };

export default function DashboardWithSidebar({ isAdmin = false }: Props) {
  const [open, setOpen] = useState(true);
  const items = isAdmin
    ? [
        { icon: Home, label: "داشبورد ادمین", href: "/admin/dashboard" },
        { icon: Package, label: "محصولات", href: "/admin/products" },
        { icon: ShoppingCart, label: "سفارش‌ها", href: "/admin/orders" },
        { icon: BarChart3, label: "تخفیف‌ها", href: "/admin/discounts" },
        { icon: Users, label: "کاربران", href: "/admin/users" },
        { icon: BarChart3, label: "گزارش‌ها", href: "/admin/analytics" },
        { icon: Settings, label: "تنظیمات", href: "/admin/settings" },
      ]
    : [
        { icon: Home, label: "داشبورد", href: "/dashboard" },
        { icon: ShoppingCart, label: "سفارش‌های من", href: "/dashboard?tab=orders" },
        { icon: Package, label: "علاقه‌مندی‌ها", href: "/dashboard?tab=wishlist" },
        { icon: Settings, label: "تنظیمات", href: "/dashboard?tab=profile" },
      ];

  return (
    <div className="bg-background text-foreground flex min-h-screen" dir="rtl">
      <aside className={`border-border sticky top-0 flex h-screen shrink-0 flex-col border-l transition-all ${open ? "w-64" : "w-16"}`}>
        <div className="flex items-center justify-between border-b p-3">
          {open ? <span className="font-iranyekan-heavy text-lg">{isAdmin ? "پنل ادمین" : "پنل کاربر"}</span> : null}
          <button type="button" className="border-border inline-flex h-9 w-9 items-center justify-center rounded-md border" onClick={() => setOpen(!open)}>
            {open ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {items.map((it) => (
            <a key={it.href} href={it.href} className="hover:bg-primary hover:text-primary-foreground flex items-center gap-3 rounded-md px-3 py-2.5 text-sm">
              <it.icon className="h-4 w-4 shrink-0" />
              {open ? <span>{it.label}</span> : null}
            </a>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <h1 className="font-iranyekan-heavy mb-2 text-3xl text-primary">{isAdmin ? "داشبورد مدیریت" : "داشبورد کاربری"}</h1>
        <p className="text-muted-foreground text-sm">پنل آماده است. بخش‌های بعدی را می‌توانید اضافه کنید.</p>
      </main>
    </div>
  );
}
