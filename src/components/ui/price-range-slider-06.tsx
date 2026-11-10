"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function toPersianDigits(n: number | string) {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

function formatToman(v: number) {
  const withSep = Math.round(v)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return toPersianDigits(withSep);
}

export type PriceRangeSlider06Props = {
  min?: number;
  max?: number;
  step?: number;
  steps?: number;
  value?: [number, number];
  defaultValue?: [number, number];
  onValueChange?: (value: [number, number]) => void;
  className?: string;
};

export function PriceRangeSlider06({
  min = 0,
  max = 50_000_000,
  step = 50_000,
  steps = 5,
  value,
  defaultValue,
  onValueChange,
  className,
}: PriceRangeSlider06Props) {
  const labels = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < steps; i++) {
      const raw = min + (i * (max - min)) / Math.max(steps - 1, 1);
      const rounded = Math.round((raw - min) / step) * step + min;
      if (!out.includes(rounded)) out.push(Math.min(max, Math.max(min, rounded)));
    }
    return out;
  }, [min, max, step, steps]);

  const initial: [number, number] = value ?? defaultValue ?? [min, max];
  const [range, setRange] = useState<number[]>(initial);
  const [preview, setPreview] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value) setRange([value[0], value[1]]);
  }, [value?.[0], value?.[1]]);

  const low = range[0] ?? min;
  const high = range[1] ?? max;
  const isDefault = low <= min && high >= max;

  const toPct = (v: number) => {
    if (max <= min) return 0;
    return ((v - min) / (max - min)) * 100;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const rawPct = (e.clientX - rect.left) / rect.width;
    // visual LTR track from Radix; map to value
    const raw = rawPct * (max - min) + min;
    setPreview(
      Math.max(min, Math.min(max, Math.round((raw - min) / step) * step + min))
    );
  };

  const emit = (pair: [number, number]) => {
    onValueChange?.(pair);
  };

  const commit = (next: number[], immediate = false) => {
    const pair: [number, number] = [
      Math.min(next[0], next[1]),
      Math.max(next[0], next[1]),
    ];
    setRange(pair);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (immediate) {
      emit(pair);
      return;
    }
    debounceRef.current = setTimeout(() => emit(pair), 280);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const lowPct = toPct(low);
  const highPct = toPct(high);
  const previewPct = preview !== null ? toPct(preview) : null;

  let ghostLeft = 0;
  let ghostWidth = 0;
  if (previewPct !== null) {
    if (previewPct < lowPct) {
      ghostLeft = previewPct;
      ghostWidth = lowPct - previewPct;
    } else if (previewPct > highPct) {
      ghostLeft = highPct;
      ghostWidth = previewPct - highPct;
    }
  }

  return (
    <div className={cn("w-full space-y-3", className)} dir="rtl">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground mb-1 text-xs font-medium">
            بازه قیمت
          </p>
          <p className="text-foreground text-sm font-bold tabular-nums leading-relaxed">
            <span>{formatToman(low)}</span>
            <span className="text-muted-foreground mx-1 font-normal">–</span>
            <span>{formatToman(high)}</span>
            <span className="text-muted-foreground mr-1 text-[11px] font-normal">
              تومان
            </span>
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          weight="sm"
          onClick={() => commit([min, max], true)}
          disabled={isDefault}
          className="text-muted-foreground hover:text-foreground h-8 shrink-0 gap-1 px-2 text-xs"
        >
          <X className="weight-3" />
          پاک کردن
        </Button>
      </div>

      <div className="space-y-2" dir="ltr">
        <div
          ref={rootRef}
          className="relative w-full px-1"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setPreview(null)}
        >
          <Slider
            value={[low, high]}
            onValueChange={(val) => {
              const arr = Array.isArray(val) ? val : [val, val];
              const a = Number(arr[0]);
              const b = Number(arr[1] ?? arr[0]);
              commit([a, b]);
            }}
            min={min}
            max={max}
            step={step}
            minStepsBetweenThumbs={1}
          />
          {previewPct !== null && ghostWidth > 0 ? (
            <div
              className="bg-secondary/30 pointer-events-none absolute top-1/2 z-[1] h-2 -translate-y-1/2 rounded-full transition-[left,width] duration-75"
              style={{ left: `${ghostLeft}%`, width: `${ghostWidth}%` }}
            />
          ) : null}
        </div>
        <div className="text-muted-foreground/70 flex justify-between select-none px-0.5 text-[10px] font-medium tabular-nums">
          {labels.map((val) => (
            <span key={val}>{formatToman(val)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PriceRangeSlider06;
