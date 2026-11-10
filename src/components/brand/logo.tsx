import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  priority?: boolean;
  size?: "sm" | "md" | "lg" | "footer";
};

const sizes = {
  sm: { width: 100, height: 30, className: "h-7 w-auto max-h-7 max-w-[6.5rem]" },
  md: { width: 140, height: 42, className: "h-8 w-auto max-h-8 max-w-[8rem]" },
  lg: { width: 160, height: 48, className: "h-9 w-auto max-h-9 max-w-[9rem]" },
  footer: { width: 220, height: 66, className: "h-12 w-auto max-h-12 max-w-[11rem] sm:h-14 sm:max-h-14 sm:max-w-[13rem]" },
};

export function Logo({ className, priority, size = "md" }: Props) {
  const s = sizes[size];

  return (
    <Link
      href="/"
      className={cn("inline-flex shrink-0 items-center", className)}
      aria-label="شادجیل"
    >
      <Image
        src="/brand/logo-light-transparent.webp"
        alt="شادجیل"
        width={s.width}
        height={s.height}
        className={cn(s.className, "dark:hidden")}
        priority={priority}
      />
      <Image
        src="/brand/logo-dark-transparent.webp"
        alt="شادجیل"
        width={s.width}
        height={s.height}
        className={cn(s.className, "hidden dark:block")}
        priority={priority}
      />
    </Link>
  );
}
