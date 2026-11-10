"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRtEvent } from "@/hooks/use-rt-event";
import { RT } from "@/lib/realtime/events";
import { Price } from "@/components/ui/price";
import * as React from "react";
import Image from "next/image";
import { CategorySvgIcon } from "@/components/home/category-icons";
import Link from "next/link";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toPersianDigits } from "@/lib/numbers";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { CarouselCardItem } from "@/lib/product-to-carousel-item";

export type { CarouselCardItem };

type CarouselCardsProps = {
  items: CarouselCardItem[];
  title?: string;
  viewAllHref?: string;
  className?: string;
  slidesToShow?: number;
  leading?: React.ReactNode;
};

function _formatPrice(_p: number) {
  return null;
}

export function CarouselCards({
  items,
  title,
  viewAllHref,
  className,
  slidesToShow = 4,
  leading,
}: CarouselCardsProps) {
  if (!items?.length && !leading) return null;

  return (
    <section className={cn("w-full", className)}>
      {(title || viewAllHref) && (
        <div className="mb-5 flex items-end justify-between gap-4">
          {title ? (
            <h2 className="text-xl font-bold tracking-tight text-primary md:text-2xl">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {viewAllHref ? (
            <Link
              href={viewAllHref}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              مشاهده همه
            </Link>
          ) : null}
        </div>
      )}

      <div className="relative px-10 md:px-12">
        <Carousel
          opts={{ align: "start", loop: false, direction: "rtl" }}
          className="w-full"
        >
          <CarouselContent className="-mr-4">
            {leading ? (
              <CarouselItem
                className={cn(
                  "pr-4",
                  slidesToShow === 2 && "basis-[85%]",
                  slidesToShow === 3 && "basis-[70%] md:basis-1/3",
                  slidesToShow === 4 &&
                    "basis-[75%] sm:basis-[45%] md:basis-1/3 lg:basis-1/4",
                )}
              >
                {leading}
              </CarouselItem>
            ) : null}

            {items.map((item) => (
              <CarouselItem
                key={item.id}
                className={cn(
                  "pr-4",
                  slidesToShow === 2 && "basis-[85%]",
                  slidesToShow === 3 && "basis-[70%] md:basis-1/3",
                  slidesToShow === 4 &&
                    "basis-[75%] sm:basis-[45%] md:basis-1/3 lg:basis-1/4",
                )}
              >
                <Link
                  href={item.href}
                  className="group block h-full overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                    <Image
                      src={item.imageUrl || "/og-image.webp"}
                      alt={item.imageAlt || item.title}
                      fill
                      className="object-contain transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 75vw, (max-width: 1024px) 33vw, 25vw"
                    />
                    {item.badge && (
                      <Badge className="absolute top-3 right-3">{item.badge}</Badge>
                    )}
                    {item.discountPercent != null && item.discountPercent > 0 && (
                      <Badge variant="destructive" className="absolute top-3 left-3">
                        ٪{toPersianDigits(item.discountPercent)}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1.5 p-3">
                    {item.brand && (
                      <p className="text-xs text-muted-foreground">{item.brand}</p>
                    )}
                    <h3 className="mt-1.5 line-clamp-2 px-1 text-center text-[20px] font-thin leading-snug tracking-wide text-primary">
                      {item.title}
                    </h3>
                    {typeof item.rating === "number" && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        <span>{toPersianDigits(item.rating.toFixed(1))}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap items-baseline gap-2 pt-1">
                      <Price amount={item.price} weight="sm" />
                      {item.originalPrice != null && item.originalPrice > item.price && (
                        <span className="text-xs text-muted-foreground line-through">
                          <Price amount={item.originalPrice} weight="sm" strike />
                        </span>
                      )}
                    </div>
                    {item.inStock === false && (
                      <p className="text-xs text-destructive">ناموجود</p>
                    )}
                  </div>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="right-0 left-auto" />
          <CarouselNext className="left-0 right-auto" />
        </Carousel>
      </div>
    </section>
  );
}

export type CarouselLinkItem = {
  id: string;
  label: string;
  labelFa?: string;
  href: string;
  imageUrl?: string | null;
};

export function CarouselLinks({
  items: initialItems,
  title,
  viewAllHref,
  className,
  variant = "brand",
}: {
  items: CarouselLinkItem[];
  title?: string;
  viewAllHref?: string;
  className?: string;
  variant?: "brand" | "category";
}) {
  const [items, setItems] = useState(initialItems);
  const router = useRouter();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useRtEvent(RT.catalog, () => {
    router.refresh();
  });

  if (!items?.length) return null;

  const _brandChip =
    "bg-muted/40 hover:border-foreground/20 flex h-20 w-full items-center justify-center rounded-2xl border px-3 text-center text-sm font-medium transition-colors hover:bg-muted/60";

  const brandBasis =
    "basis-[calc((100%-0.5rem)/1.5)] pr-3 sm:basis-[calc((100%-1rem)/2.5)] lg:basis-[calc((100%-1.5rem)/4.5)]";

  const categoryBasis =
    "basis-[calc((100%-0.5rem)/1.5)] pr-3 sm:basis-[calc((100%-1rem)/2.5)] lg:basis-[calc((100%-1.5rem)/4.5)]";

  return (
    <section className={cn("w-full", className)}>
      {(title || viewAllHref) && (
        <div className="mb-5 flex items-end justify-between gap-4">
          {title ? (
            <h2 className="text-xl font-bold text-primary md:text-2xl">{title}</h2>
          ) : (
            <span />
          )}
          {viewAllHref ? (
            <Link
              href={viewAllHref}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              مشاهده همه
            </Link>
          ) : null}
        </div>
      )}

      <div className="-mx-4">
        <Carousel
          opts={{ align: "start", loop: false, direction: "rtl", dragFree: true }}
          className="w-full"
        >
          <CarouselContent className="-mr-4 ml-0 px-4">
            {items.map((item) => (
              <CarouselItem
                key={item.id}
                className={variant === "category" ? categoryBasis : brandBasis}
              >
                {variant === "category" ? (
                  <Link
                    href={item.href}
                    className="group flex aspect-square w-full flex-col items-center justify-center gap-4 rounded-2xl border bg-card px-1.5 py-2 text-center shadow-sm transition hover:border-primary/30 hover:bg-muted/20 hover:shadow-md"
                  >
                    <span className="flex h-[5.75rem] w-[5.75rem] items-center justify-center rounded-2xl bg-primary/5 ring-1 ring-primary/10 transition group-hover:bg-primary/10">
                      <CategorySvgIcon name={item.label} slug={item.href} className="size-[4.14rem]" />
                    </span>
                    <span className="line-clamp-2 text-[20px] font-thin leading-snug tracking-wide text-primary">
                      {item.label}
                    </span>
                  </Link>
                ) : (
                  <Link
                    href={item.href}
                    className="bg-secondary hover:bg-secondary/90 border-secondary flex aspect-square w-full flex-col items-center justify-center gap-4 rounded-2xl border px-2 py-2.5 shadow-sm transition-colors"
                    aria-label={item.label}
                  >
                    {item.imageUrl ? (
                      <span
                        className="block h-[5.75rem] w-[5.75rem] shrink-0 bg-white dark:bg-[#212529]"
                        style={{
                          WebkitMaskImage: `url(${item.imageUrl})`,
                          maskImage: `url(${item.imageUrl})`,
                          WebkitMaskSize: "contain",
                          maskSize: "contain",
                          WebkitMaskRepeat: "no-repeat",
                          maskRepeat: "no-repeat",
                          WebkitMaskPosition: "center",
                          maskPosition: "center",
                        }}
                        role="img"
                        aria-label={item.label}
                      />
                    ) : null}
                    <span className="mt-1.5 line-clamp-2 px-1 text-center text-[20px] font-thin leading-snug tracking-wide text-white dark:text-[#212529]">
                      {item.labelFa || item.label}
                    </span>
                  </Link>
                )}
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </section>
  );
}
