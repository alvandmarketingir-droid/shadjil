"use client";


import { Price } from "@/components/ui/price";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatJalaliDate } from "@/lib/dates/jalali";
type Props = {
  ticketId: string;
  amount: number;
  date?: Date;
  cardHolder?: string;
  barcodeValue?: string;
};

export function AnimatedTicket({
  ticketId,
  amount,
  date = new Date(),
  cardHolder = "پرداخت در محل / آنلاین",
  barcodeValue,
}: Props) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(t);
  }, []);

  const code = barcodeValue || ticketId.replace(/-/g, "").slice(0, 14);
  const dateStr = formatJalaliDate(date);

  return (
    <div
      className={`mx-auto w-full max-w-md transition-all duration-500 ${
        show ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
      dir="rtl"
    >
      <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-lg">
        <div className="bg-primary text-primary-foreground px-5 py-4 text-center">
          <p className="text-sm opacity-90">سفارش ثبت شد</p>
          <p className="mt-1 font-bold tracking-wide">{ticketId.slice(0, 13)}</p>
        </div>
        <div className="space-y-3 p-5 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">مبلغ قابل پرداخت</span>
            <span className="font-semibold">
              <Price amount={amount} weight="sm" />
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">تاریخ</span>
            <span>{dateStr}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">روش</span>
            <span>{cardHolder}</span>
          </div>
          <div className="border-border mt-2 border-t border-dashed pt-3 text-center">
            <p className="text-muted-foreground text-xs">کد پیگیری</p>
            <p className="mt-1 font-mono text-base tracking-widest">{code}</p>
          </div>
        </div>
        <div className="border-border flex gap-2 border-t p-4">
          <Link
            href={`/dashboard?tab=orders&order=${ticketId}`}
            className="bg-primary text-primary-foreground flex h-10 flex-1 items-center justify-center rounded-xl text-sm font-medium"
          >
            مشاهده سفارش
          </Link>
          <Link
            href="/products"
            className="border-border flex h-10 flex-1 items-center justify-center rounded-xl border text-sm"
          >
            ادامه خرید
          </Link>
        </div>
      </div>
    </div>
  );
}
