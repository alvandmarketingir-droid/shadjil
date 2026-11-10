"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";

type Props = {
  onSend: (text: string) => void | Promise<void>;
  placeholder?: string;
  sendLabel?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * ورودی متن خریدار — بدون لینک و بدون تصویر (عمداً غیرفعال).
 */
export function ComposerInput({
  onSend,
  placeholder = "متن خود را بنویسید…",
  sendLabel = "ارسال",
  disabled = false,
  className,
}: Props) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const text = value.trim();
    if (!text || busy || disabled) return;
    setBusy(true);
    try {
      await onSend(text);
      setValue("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      dir="rtl"
      className={cn(
        "bg-card text-card-foreground border-border rounded-2xl border p-2 shadow-sm",
        className,
      )}
    >
      <textarea
        className="placeholder:text-muted-foreground min-h-[88px] w-full reweight-y rounded-xl bg-transparent px-3 py-2 text-sm outline-none"
        placeholder={placeholder}
        value={value}
        disabled={disabled || busy}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void submit();
          }
        }}
      />
      <div className="mt-1 flex items-center justify-end gap-2 px-1">
        <Button
          type="button"
          weight="sm"
          className="gap-1.5"
          disabled={disabled || busy || !value.trim()}
          onClick={() => void submit()}
        >
          <Send className="h-4 w-4" />
          {sendLabel}
        </Button>
      </div>
    </div>
  );
}