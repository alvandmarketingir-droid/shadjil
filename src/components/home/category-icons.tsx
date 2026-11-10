"use client";


import type { ReactElement } from "react";
import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

function svgProps(props: IconProps) {
  const { className, ...rest } = props;
  return {
    className: cn("weight-10 shrink-0 text-primary", className),
    viewBox: "0 0 48 48",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true as const,
    ...rest,
  };
}

/** آجیل رسمی */
export function IconShirtFormal(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path
        d="M16 9 L24 14 L32 9 L39 14 L35 21 V40 H13 V21 L9 14 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M24 14 V26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 26 H29" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="24" cy="30" r="1.4" fill="currentColor" />
      <circle cx="24" cy="34.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

/** آجیل کژوال */
export function IconShirtCasual(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path
        d="M15 10 L24 15 L33 10 L39 15 L35 22 V39 H13 V22 L9 15 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M24 15 V22" stroke="currentColor" strokeWidth="2" />
      <path d="M18 21 C20 24 28 24 30 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** اسپرت و کار */
export function IconSportWork(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path
        d="M14 12 L24 16 L34 12 L38 16 L34 22 V38 H14 V22 L10 16 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M24 16 V24" stroke="currentColor" strokeWidth="2" />
      <path d="M18 28 H30" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 32 H28" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/** بر اساس فیت */
export function IconFit(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path
        d="M18 10 L24 14 L30 10 L36 14 L32 20 V40 H16 V20 L12 14 Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M24 14 V38" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2 3" />
      <path d="M17 26 H31" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18 32 H30" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** بر اساس پارچه — بافت پارچه */
export function IconFabric(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="10" y="10" width="28" height="28" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M10 18 H38 M10 26 H38 M10 34 H38" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
      <path d="M18 10 V38 M26 10 V38 M34 10 V38" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
    </svg>
  );
}


/**  */
export function IconTie(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M20 8 L24 12 L28 8 L30 10 L26 16 L28 40 L24 36 L20 40 L22 16 L18 10 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M18 8 H30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**  */
export function IconBowTie(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M10 20 L22 24 L10 28 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M38 20 L26 24 L38 28 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <rect x="21" y="21" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/**  */
export function IconCufflink(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="18" cy="24" r="7" stroke="currentColor" strokeWidth="2" />
      <circle cx="30" cy="24" r="7" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="24" r="2.5" fill="currentColor" />
      <circle cx="30" cy="24" r="2.5" fill="currentColor" />
      <path d="M25 24 H23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** جین / دنیم */
export function IconDenim(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M15 10 L24 15 L33 10 L38 15 L34 22 V40 H14 V22 L10 15 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M18 22 L24 28 L30 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 32 H32" stroke="currentColor" strokeWidth="1.6" opacity="0.7" />
      <path d="M16 36 H28" stroke="currentColor" strokeWidth="1.6" opacity="0.7" />
    </svg>
  );
}

/** سوغات */
export function IconAccessory(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="24" cy="24" r="12" stroke="currentColor" strokeWidth="2" />
      <circle cx="24" cy="24" r="5" stroke="currentColor" strokeWidth="2" />
      <path d="M24 12 V16 M24 32 V36 M12 24 H16 M32 24 H36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconCategoryDefault(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="11" y="12" width="26" height="24" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M11 20 H37" stroke="currentColor" strokeWidth="2" />
      <path d="M19 12 V20 M29 12 V20" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

const RULES: { test: (s: string) => boolean; Icon: (p: IconProps) => ReactElement }[] = [
  { test: (s) => /پارچه|fabric|کتان|پنبه|نخ|لینن|پشم/.test(s), Icon: IconFabric },
  { test: (s) => /فیت|fit|slim|regular|مناسبت‌ها/.test(s), Icon: IconFit },
  { test: (s) => /|bow[- ]?tie|/.test(s), Icon: IconBowTie },
  { test: (s) => /|necktie|\btie\b|کراوات/.test(s), Icon: IconTie },
  { test: (s) => /سردست|cufflink|دکمه/.test(s), Icon: IconCufflink },
  { test: (s) => /جین|denim|jean/.test(s), Icon: IconDenim },
  { test: (s) => /سوغات|accessory|کمربند|جوراب|شال/.test(s), Icon: IconAccessory },
  { test: (s) => /اسپرت|کار|sport|work|کارگری/.test(s), Icon: IconSportWork },
  { test: (s) => /کژوال|casual|روزمره|اکسفورد|oxford/.test(s), Icon: IconShirtCasual },
  { test: (s) => /رسمی|formal|مجلسی|اداری|dress/.test(s), Icon: IconShirtFormal },
  { test: (s) => /آجیل|shirt/.test(s), Icon: IconShirtFormal },
];

export function CategorySvgIcon({
  name,
  slug,
  className,
}: {
  name?: string | null;
  slug?: string | null;
  className?: string;
}) {
  const key = `${name ?? ""} ${slug ?? ""}`.toLowerCase();
  for (const r of RULES) {
    if (r.test(key)) return <r.Icon className={className} />;
  }
  return <IconCategoryDefault className={className} />;
}
