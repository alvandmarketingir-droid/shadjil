"use client";

import { cn } from "@/lib/utils";

type Props = {
  open?: boolean;
  className?: string;
  duration?: number;
};

export function MenuToggleIcon({ open, className, duration = 300 }: Props) {
  return (
    <span
      className={cn("relative inline-flex size-5 items-center justify-center", className)}
      data-open={open ? "true" : "false"}
    >
      <span
        className={cn(
          "absolute h-0.5 w-4 rounded-full bg-current transition-transform",
          open && "translate-y-0 rotate-45"
        )}
        style={{ transitionDuration: `${duration}ms`, transform: open ? undefined : "translateY(-5px)" }}
      />
      <span
        className={cn(
          "absolute h-0.5 w-4 rounded-full bg-current transition-opacity",
          open && "opacity-0"
        )}
        style={{ transitionDuration: `${duration}ms` }}
      />
      <span
        className={cn(
          "absolute h-0.5 w-4 rounded-full bg-current transition-transform",
          open && "translate-y-0 -rotate-45"
        )}
        style={{ transitionDuration: `${duration}ms`, transform: open ? undefined : "translateY(5px)" }}
      />
    </span>
  );
}
