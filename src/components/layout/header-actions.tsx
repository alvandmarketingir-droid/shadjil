"use client";

import { useState } from "react";
import {
  Heart,
  ArrowLeftRight,
  ShoppingBag,
  History,
} from "lucide-react";
import { HeaderIconButton } from "@/components/layout/header-icon-button";
import {
  HeaderActivitySheet,
  type ActivityPanel,
} from "@/components/layout/header-activity-sheet";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { cn } from "@/lib/utils";

// اگر مسیر فرق دارد فقط این خط را عوض کن:
import { ThemeToggle } from "@/components/theme/theme-toggle";

type Props = {
  className?: string;
  showTheme?: boolean;
};

export function HeaderActions({ className, showTheme = true }: Props) {
  const [panel, setPanel] = useState<ActivityPanel>(null);

  return (
    <>
      
      <NotificationBell />
<div className={cn("flex flex-wrap items-center gap-1.5", className)}>
        {showTheme ? (
          <ThemeToggle />
        ) : null}

        <HeaderIconButton
          label="آخرین بازدیدها"
          onClick={() => setPanel("recent")}
        >
          <History className="h-5 w-5" />
        </HeaderIconButton>

        <HeaderIconButton label="سبد خرید" onClick={() => setPanel("cart")}>
          <ShoppingBag className="h-5 w-5" />
        </HeaderIconButton>

        <HeaderIconButton label="مقایسه" onClick={() => setPanel("compare")}>
          <ArrowLeftRight className="h-5 w-5" />
        </HeaderIconButton>

        <HeaderIconButton
          label="علاقه‌مندی‌ها"
          onClick={() => setPanel("wishlist")}
        >
          <Heart className="h-5 w-5" />
        </HeaderIconButton>
      </div>

      <HeaderActivitySheet
        open={panel}
        onOpenChange={(o) => {
          if (!o) setPanel(null);
        }}
      />
    </>
  );
}
