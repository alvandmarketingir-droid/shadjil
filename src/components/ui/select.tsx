"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { UiState, useUiState } from "@/lib/ui-states";

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  state?: UiState;
  errorText?: string;
  onChange?: (value: string) => void;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, state, errorText, onChange, children, ...props }, ref) => {
    const { state: currentState, setState, setError } = useUiState();
    const effectiveState = state ?? currentState;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setState("idle");
      setError(null);
      onChange?.(e.target.value);
    };

    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            {
              "border-destructive focus:ring-destructive": effectiveState === "error",
              "border-emerald-500 focus:ring-emerald-500": effectiveState === "success",
              "border-amber-500 focus:ring-amber-500": effectiveState === "warning",
              "opacity-75": effectiveState === "disabled",
              "animate-pulse": effectiveState === "loading",
            },
            className
          )}
          onChange={handleChange}
          {...props}
        >
          {children}
        </select>
        {errorText && (
          <p className="mt-1 text-xs text-destructive">{errorText}</p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
