"use client";

import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Heart, ArrowLeftRight, ShoppingBag, History } from "lucide-react";

export type ActivityPanel = "cart" | "wishlist" | "compare" | "recent" | null;

const meta: Record<
  Exclude<ActivityPanel, null>,
  { title: string; description: string; empty: string; Icon: typeof Heart }
> = {
  cart: {
    title: "سبد خرید",
    description: "محصولات آماده‌ی خرید را بررسی کنید.",
    empty: "هنوز محصولی به سبد اضافه نشده است.",
    Icon: ShoppingBag,
  },
  wishlist: {
    title: "علاقه‌مندی‌ها",
    description: "محصولاتی که ذخیره کرده‌اید.",
    empty: "لیست علاقه‌مندی‌ها خالی است.",
    Icon: Heart,
  },
  compare: {
    title: "مقایسه محصولات",
    description: "محصولات انتخاب‌شده برای مقایسه.",
    empty: "محصولی برای مقایسه انتخاب نشده است.",
    Icon: ArrowLeftRight,
  },
  recent: {
    title: "آخرین بازدیدها",
    description: "محصولاتی که اخیراً دیده‌اید.",
    empty: "هنوز محصولی بازدید نشده است.",
    Icon: History,
  },
};

type Props = {
  open: ActivityPanel;
  onOpenChange: (open: boolean) => void;
  items?: { id: string; title: string; href?: string }[];
};

export function HeaderActivitySheet({ open, onOpenChange, items = [] }: Props) {
  const key = open;
  const info = key ? meta[key] : null;
  const Icon = info?.Icon ?? ShoppingBag;

  return (
    <Drawer
      open={!!open}
      onOpenChange={(o) => {
        if (!o) onOpenChange(false);
      }}
      direction="right"
    >
      <DrawerContent>
        {info ? (
          <>
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                {info.title}
              </DrawerTitle>
              <DrawerDescription>{info.description}</DrawerDescription>
            </DrawerHeader>
            <DrawerBody className="max-h-[60vh]">
              {items.length === 0 ? (
                <div className="py-8 text-center">
                  <Icon className="text-muted-foreground/40 mx-auto mb-4 h-16 w-16" />
                  <p className="text-muted-foreground mb-4 text-sm">{info.empty}</p>
                  <DrawerClose className="border-input bg-background hover:bg-muted inline-flex h-8 w-full items-center justify-center rounded-md border px-3 text-sm">
                    ادامه خرید
                  </DrawerClose>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <a
                      key={item.id}
                      href={item.href ?? "#"}
                      className="hover:bg-primary hover:text-primary-foreground block rounded-lg border p-3 text-sm transition-roasts"
                    >
                      {item.title}
                    </a>
                  ))}
                </div>
              )}
            </DrawerBody>
            <DrawerFooter className="grid-cols-1">
              <DrawerClose className="border-input bg-background hover:bg-muted inline-flex h-8 w-full items-center justify-center rounded-md border px-3 text-sm">
                بستن
              </DrawerClose>
            </DrawerFooter>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
