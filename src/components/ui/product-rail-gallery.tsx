"use client";

import * as React from "react";
import { createPortal } from "react-dom";

export type GarmentKind = "tee" | "knit" | "hoodie" | "shirt" | "jacket" | "coat";

export interface RailGarment {
  id: string;
  name: string;
  description?: string;
  kind?: GarmentKind;
  color?: string;
  trim?: string;
  image?: string;
  backImage?: string;
  sideImage?: string;
  tag?: string;
  details?: string[];
}

export interface ClothingRailHeroLabels {
  front: string;
  back: string;
  close: string;
  show: string;
}

export interface ClothingRailHeroProps extends React.ComponentProps<"section"> {
  items: RailGarment[];
  eyebrow?: string;
  heading?: string;
  caption?: string;
  action?: React.ReactNode;
  autoplay?: boolean;
  interval?: number;
  hanger?: "wood" | "matte" | "none";
  labels?: ClothingRailHeroLabels;
  onOpenChange?: (index: number | null) => void;
}

const DEFAULT_LABELS: ClothingRailHeroLabels = {
  front: "جلو",
  back: "پشت",
  close: "بستن",
  show: "نمایش",
};

/** silhouette paths simplified per kind (viewBox 0 0 200 310) */
function bodyPath(kind: GarmentKind): string {
  switch (kind) {
    case "tee":
      return "M80,40 C88,52 112,52 120,40 L158,52 C162,58 164,66 164,78 L152,108 L154,236 C128,242 72,242 46,236 L48,108 L36,78 C36,66 38,58 42,52 Z";
    case "shirt":
      return "M80,36 C88,44 112,44 120,36 L160,50 C164,56 166,64 166,76 L164,232 C150,244 124,242 100,238 C76,242 50,244 36,232 L34,76 C34,64 36,56 40,50 Z";
    case "knit":
      return "M80,38 C88,50 112,50 120,38 L158,50 C162,58 164,68 164,80 L164,226 C140,232 60,232 36,226 L36,80 C36,68 38,58 42,50 Z";
    case "hoodie":
      return "M72,48 C64,28 72,12 100,10 C128,12 136,28 128,48 L160,58 C164,66 166,76 166,88 L166,228 C142,234 58,234 34,228 L34,88 C34,76 36,66 40,58 Z";
    case "jacket":
      return "M80,36 C88,44 112,44 120,36 L162,52 C166,60 168,70 168,82 L166,230 L34,230 L32,82 C32,70 34,60 38,52 Z";
    case "coat":
      return "M80,36 C88,44 112,44 120,36 L164,54 C168,62 170,72 170,84 L174,294 L26,294 L30,84 C30,72 32,62 36,54 Z";
    default:
      return bodyPath("shirt");
  }
}

function GarmentFigure({
  item,
  active,
}: {
  item: RailGarment;
  active: boolean;
}) {
  const kind = item.kind ?? "shirt";
  const color = item.color ?? "#8a8a8a";
  const trim = item.trim ?? "#333";
  return (
    <div
      className={`relative mx-auto h-[220px] w-[140px] transition-transform duration-300 sm:h-[260px] sm:w-[160px] ${
        active ? "z-20 -translate-y-2 scale-105" : "z-10 scale-100 opacity-90"
      }`}
    >
      <svg viewBox="0 0 200 310" className="h-full w-full drop-shadow-md" aria-hidden>
        <path
          d="M100,8 C100,4 104,2 106,4 C108,6 108,10 106,12 L100,28"
          fill="none"
          stroke={trim}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M40,58 Q70,38 100,36 Q130,38 160,58"
          fill="none"
          stroke={trim}
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.85"
        />
        {item.image ? (
          <image
            href={item.image}
            x="20"
            y="40"
            width="160"
            height="250"
            preserveAspectRatio="xMidYMin meet"
          />
        ) : (
          <>
            <path d={bodyPath(kind)} fill={color} />
            <path d={bodyPath(kind)} fill="url(#shade)" opacity="0.35" />
          </>
        )}
        <defs>
          <linearGradient id="shade" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity="0.25" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.08" />
            <stop offset="1" stopColor="#000" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>
      {item.tag ? (
        <span className="absolute left-1/2 top-[18%] -translate-x-1/2 rotate-[-8deg] rounded border border-foreground/15 bg-card px-1.5 py-0.5 text-[9px] font-semibold text-card-foreground shadow-sm">
          {item.tag}
        </span>
      ) : null}
    </div>
  );
}

export function ClothingRailHero({
  items,
  eyebrow,
  heading,
  caption,
  action,
  autoplay = false,
  interval = 2800,
  labels = DEFAULT_LABELS,
  onOpenChange,
  className,
  ...rest
}: ClothingRailHeroProps) {
  const [active, setActive] = React.useState<number | null>(null);
  const [open, setOpen] = React.useState<number | null>(null);
  const count = items.length;

  const choose = React.useCallback(
    (i: number | null) => {
      setActive(i);
    },
    [],
  );

  React.useEffect(() => {
    if (!autoplay || count === 0 || open !== null) return;
    let i = 0;
    const t = window.setInterval(() => {
      i = (i + 1) % count;
      choose(i);
    }, interval);
    return () => window.clearInterval(t);
  }, [autoplay, interval, count, open, choose]);

  const current = active !== null ? items[active] : null;

  const openDetail = (i: number) => {
    setActive(i);
    setOpen(i);
    onOpenChange?.(i);
  };
  const closeDetail = () => {
    setOpen(null);
    onOpenChange?.(null);
  };

  return (
    <section
      {...rest}
      data-slot="clothing-rail-hero"
      className={`relative isolate w-full overflow-hidden bg-background text-foreground ${className ?? ""}`}
    >
      {(eyebrow || heading) && (
        <header className="relative z-10 flex flex-col items-center gap-2 px-6 pt-8 text-center">
          {eyebrow ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          {heading ? (
            <h2 className="text-balance text-2xl font-medium tracking-tight sm:text-3xl">
              {heading}
            </h2>
          ) : null}
        </header>
      )}

      <div className="relative mt-4 w-full px-2 pb-2 pt-6 sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-4 top-[28px] h-3 rounded-full bg-gradient-to-b from-muted-foreground/40 via-muted-foreground/70 to-muted-foreground/50 shadow-sm sm:inset-x-10"
        />
        <ul className="relative flex snap-x snap-mandatory gap-1 overflow-x-auto pb-4 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item, i) => {
            const isOn = active === i;
            return (
              <li key={item.id} className="snap-center shrink-0 px-1 first:pl-4 last:pr-4 sm:px-2">
                <button
                  type="button"
                  aria-label={item.name}
                  aria-pressed={isOn}
                  className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onMouseEnter={() => choose(i)}
                  onFocus={() => choose(i)}
                  onClick={() => openDetail(i)}
                >
                  <GarmentFigure item={item} active={isOn} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4 px-6 pb-8 pt-2 text-center">
        <div className="min-h-[3.25rem]">
          <p className="text-sm font-medium">
            {current ? current.name : caption}
          </p>
          {current?.description ? (
            <p className="mx-auto mt-1 max-w-[42ch] text-[13px] leading-relaxed text-muted-foreground">
              {current.description}
            </p>
          ) : null}
        </div>
        {action}
      </div>

      {open !== null && items[open] && typeof document !== "undefined"
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-6 backdrop-blur-md"
              onClick={closeDetail}
            >
              <div
                className="relative grid w-full max-w-3xl gap-8 rounded-2xl border bg-card p-6 text-card-foreground shadow-xl md:grid-cols-[1fr_1.1fr] md:p-8"
                onClick={(e) => e.stopPropagation()}
              >
                <GarmentFigure item={items[open]} active />
                <div className="flex flex-col gap-3 text-center md:text-right">
                  <p className="font-mono text-[11px] tracking-widest text-muted-foreground">
                    {String(open + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
                  </p>
                  <h3 className="text-2xl font-medium">{items[open].name}</h3>
                  {items[open].description ? (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {items[open].description}
                    </p>
                  ) : null}
                  {items[open].details && items[open].details!.length > 0 ? (
                    <ul className="flex flex-wrap justify-center gap-2 md:justify-start">
                      {items[open].details!.map((d) => (
                        <li
                          key={d}
                          className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
                        >
                          {d}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <button
                    type="button"
                    onClick={closeDetail}
                    className="mt-2 self-center rounded-full border px-4 py-1.5 text-sm md:self-start"
                  >
                    {labels.close}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

export default ClothingRailHero;
