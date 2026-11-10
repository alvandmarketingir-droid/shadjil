import { cn } from "@/lib/utils";
import { toPersianDigits } from "@/lib/numbers";

type PriceProps = {
  amount: number | string | null | undefined;
  className?: string;
  /** sm | md | lg | pdp (≈۲×) */
  weight?: "sm" | "md" | "lg" | "pdp";
  bare?: boolean;
  strike?: boolean;
};

function formatAmount(amount: number | string | null | undefined): string {
  if (amount == null || amount === "") return "—";
  const n =
    typeof amount === "number"
      ? amount
      : Number(String(amount).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return toPersianDigits(String(amount));
  return toPersianDigits(Math.round(n).toLocaleString("en-US"));
}

const weightClass = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  pdp: "text-2xl md:text-3xl",
} as const;

const tomanSize = {
  sm: "text-[11px]",
  md: "text-xs",
  lg: "text-sm",
  pdp: "text-base md:text-lg",
} as const;

/** عدد: bold | تومان: secondary + font-thin */
export function Price({
  amount,
  className,
  weight = "md",
  bare = false,
  strike = false,
}: PriceProps) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1",
        weightClass[weight],
        strike && "line-through opacity-60",
        className,
      )}
      dir="rtl"
    >
      <span className="font-bold tabular-nums text-foreground">
        {formatAmount(amount)}
      </span>
      {!bare ? (
        <span
          className={cn(
            "font-thin text-secondary dark:!text-white",
            tomanSize[weight],
          )}
        >
          تومان
        </span>
      ) : null}
    </span>
  );
}
