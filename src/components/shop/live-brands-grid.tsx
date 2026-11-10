"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRtEvent } from "@/hooks/use-rt-event";
import { RT } from "@/lib/realtime/events";

type Brand = { id: string; name: string; slug: string };

async function _fetchBrands(): Promise<Brand[]> {
  try {
    const _res = await fetch("/api/nav/mega", { cache: "no-store" });
    // fallback: page will still have SSR data; optional API may not list brands
  } catch {
    /* ignore */
  }
  return [];
}

export function LiveBrandsGrid({ initialBrands }: { initialBrands: Brand[] }) {
  const [brands, setBrands] = useState(initialBrands);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setBrands(initialBrands);
  }, [initialBrands]);

  // با سیگنال catalog صفحه را از سرور تازه کن (لیست برچسب از SSR)
  useRtEvent(RT.catalog, () => {
    startTransition(() => {
      // parent page is force-dynamic; router.refresh from parent helper
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("pm:need-router-refresh"));
      }
    });
  });

  if (!brands.length) {
    return (
      <p className="text-muted-foreground text-center">برچسبی ثبت نشده است.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
      {brands.map((b) => (
        <Link
          key={b.id}
          href={`/brands/${b.slug}`}
          className="bg-card hover:border-foreground/20 flex h-24 items-center justify-center rounded-2xl border px-3 text-center text-sm font-medium transition-colors hover:bg-muted/40"
        >
          {b.name}
        </Link>
      ))}
    </div>
  );
}
