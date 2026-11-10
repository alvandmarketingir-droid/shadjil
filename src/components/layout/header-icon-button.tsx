"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/** استایل یکسان با دکمه لایت/دارک: بردر + اندازه */
export const headerIconClass =
  "inline-flex h-9 w-9 min-h-9 min-w-9 max-h-9 max-w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background p-0 text-foreground shadow-sm transition-colors hover:bg-primary hover:text-primary-foreground hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Props = {
  href?: string;
  onClick?: () => void;
  label: string;
  children: React.ReactNode;
  className?: string;
};

export function HeaderIconButton({
  href,
  onClick,
  label,
  children,
  className,
}: Props) {
  const cls = cn(headerIconClass, className);

  if (href && !onClick) {
    return (
      <Link href={href} className={cls} aria-label={label}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={cls} aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}
