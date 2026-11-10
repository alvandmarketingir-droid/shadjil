"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type PointerEvent,
} from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const COMPACT_LAYOUT_BREAKPOINT = 1280;
const ANIMATION_DURATION_MS = 450;

export interface ArrowFillButtonOwnProps {
  btnText?: string;
  href?: string;
  className?: string;
  bgColor?: string;
  textColor?: string;
  fillBgColor?: string;
  fillTextColor?: string;
  hoverFillBgColor?: string;
  hoverFillTextColor?: string;
  arrowColor?: string;
  hoverArrowColor?: string;
}

export type ArrowFillButtonProps = ArrowFillButtonOwnProps &
  Omit<ComponentPropsWithoutRef<"a">, keyof ArrowFillButtonOwnProps>;

export function ArrowFillButton({
  btnText = "Hover Me",
  href = "#",
  className = "",
  bgColor = "var(--secondary)",
  textColor = "var(--secondary-foreground)",
  fillBgColor = "var(--secondary-foreground)",
  fillTextColor = "var(--secondary)",
  hoverFillBgColor = "var(--secondary-foreground)",
  hoverFillTextColor = "var(--secondary)",
  arrowColor,
  hoverArrowColor,
  ...props
}: ArrowFillButtonProps) {
  const [isReady, setIsReady] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const releaseTimeoutRef = useRef<number | null>(null);
  const usesUtilityBackground =
    className.includes("bg-") ||
    className.includes("from-") ||
    className.includes("via-") ||
    className.includes("to-");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${COMPACT_LAYOUT_BREAKPOINT - 1}px)`);
    const sync = (event: MediaQueryList | MediaQueryListEvent) => {
      const matches = "matches" in event ? event.matches : false;
      setIsCompactLayout(matches);
      if (!matches) setIsPressed(false);
    };
    sync(mq);
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    return () => {
      if (releaseTimeoutRef.current) window.clearTimeout(releaseTimeoutRef.current);
    };
  }, []);

  const clearPressedState = () => {
    if (releaseTimeoutRef.current) window.clearTimeout(releaseTimeoutRef.current);
    releaseTimeoutRef.current = window.setTimeout(() => {
      setIsPressed(false);
      releaseTimeoutRef.current = null;
    }, ANIMATION_DURATION_MS);
  };

  const handlePointerDown = (event: PointerEvent<HTMLAnchorElement>) => {
    props.onPointerDown?.(event);
    if (!isCompactLayout || event.pointerType === "mouse") return;
    if (releaseTimeoutRef.current) {
      window.clearTimeout(releaseTimeoutRef.current);
      releaseTimeoutRef.current = null;
    }
    setIsPressed(true);
  };

  const handlePointerUp = (event: PointerEvent<HTMLAnchorElement>) => {
    props.onPointerUp?.(event);
    if (!isCompactLayout || event.pointerType === "mouse") return;
    clearPressedState();
  };

  const handlePointerCancel = (event: PointerEvent<HTMLAnchorElement>) => {
    props.onPointerCancel?.(event);
    if (!isCompactLayout || event.pointerType === "mouse") return;
    clearPressedState();
  };

  return (
    <a
      href={href}
      {...props}
      data-pressed={isPressed ? "true" : "false"}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className={cn(
        "group relative inline-flex h-11 w-fit cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[var(--btn-bg)] px-6 pr-14 whitespace-nowrap text-sm font-medium leading-none sm:h-12 sm:px-7 sm:pr-16 sm:text-base",
        usesUtilityBackground ? "" : "bg-[var(--btn-bg)]",
        "text-[var(--btn-text)]",
        className,
      )}
      style={
        {
          "--btn-bg": bgColor,
          "--btn-text": textColor,
          "--btn-fill-bg": fillBgColor,
          "--btn-fill-text": fillTextColor,
          "--btn-fill-bg-hover": hoverFillBgColor,
          "--btn-fill-text-hover": hoverFillTextColor,
          "--btn-arrow": arrowColor || fillTextColor,
          "--btn-arrow-hover": hoverArrowColor || hoverFillTextColor,
          visibility: isReady ? "visible" : "hidden",
        } as CSSProperties
      }
    >
      <span className="relative z-[1] pb-px">{btnText}</span>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-[0.35rem] right-1.5 z-[2] w-8 rounded-full bg-[var(--btn-fill-bg)] sm:inset-y-[0.4rem] sm:right-2 sm:w-9",
          isReady &&
            "transition-all duration-[450ms] ease-[cubic-bezier(0.785,0.135,0.15,0.86)] group-hover:inset-0 group-hover:w-full group-hover:bg-[var(--btn-fill-bg-hover)] group-data-[pressed=true]:inset-0 group-data-[pressed=true]:w-full group-data-[pressed=true]:bg-[var(--btn-fill-bg-hover)]",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 z-[2] flex items-center px-6 pr-14 text-[var(--btn-fill-text)] [clip-path:inset(0.35rem_0.35rem_0.35rem_calc(100%-2.35rem))] sm:px-7 sm:pr-16 sm:[clip-path:inset(0.4rem_0.5rem_0.4rem_calc(100%-2.6rem))]",
          isReady &&
            "transition-all duration-[450ms] ease-[cubic-bezier(0.785,0.135,0.15,0.86)] group-hover:text-[var(--btn-fill-text-hover)] group-hover:[clip-path:inset(0_0_0_0)] group-data-[pressed=true]:text-[var(--btn-fill-text-hover)] group-data-[pressed=true]:[clip-path:inset(0_0_0_0)]",
        )}
      >
        <span className="relative z-[1] pb-px whitespace-nowrap">{btnText}</span>
      </div>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 right-1.5 z-[3] inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full bg-[var(--btn-fill-bg)] text-[var(--btn-arrow)] sm:right-2 sm:h-9 sm:w-9",
          isReady &&
            "transition-colors duration-[450ms] ease-[cubic-bezier(0.785,0.135,0.15,0.86)] group-hover:bg-[var(--btn-fill-bg-hover)] group-hover:text-[var(--btn-arrow-hover)] group-data-[pressed=true]:bg-[var(--btn-fill-bg-hover)] group-data-[pressed=true]:text-[var(--btn-arrow-hover)]",
        )}
      >
        <ArrowLeft
          className={cn(
            "absolute top-1/2 left-1/2 size-4 scale-0 translate-x-[170%] -translate-y-1/2 text-current",
            isReady &&
              "transition-transform duration-[450ms] ease-[cubic-bezier(0.785,0.135,0.15,0.86)] group-hover:-translate-x-1/2 group-hover:scale-100 group-data-[pressed=true]:-translate-x-1/2 group-data-[pressed=true]:scale-100",
          )}
          strokeWidth={1.8}
        />
        <ArrowLeft
          className={cn(
            "absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-current",
            isReady &&
              "transition-transform duration-[450ms] ease-[cubic-bezier(0.785,0.135,0.15,0.86)] group-hover:-translate-x-[170%] group-hover:scale-0 group-data-[pressed=true]:-translate-x-[170%] group-data-[pressed=true]:scale-0",
          )}
          strokeWidth={1.8}
        />
      </span>
    </a>
  );
}

export default ArrowFillButton;
