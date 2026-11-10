"use client";

import * as React from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArrowLeft, Mail, Clock, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as d3 from "d3";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection, GeometryObject } from "topojson-specification";
import type { GeoPermissibleObjects } from "d3";

const smoothEase = [0.25, 0.1, 0.25, 1] as const;

const CONTACT_LINKS = [
  {
    icon: Mail,
    label: "info@shadjil.ir",
    href: "mailto:info@shadjil.ir",
  },
  {
    icon: Headphones,
    label: "پشتیبانی سفارش و مرجوعی",
    href: "mailto:info@shadjil.ir",
  },
  {
    icon: Clock,
    label: "شنبه تا پنجشنبه، ۹ تا ۱۸",
    href: "#",
  },
];

interface GlobeWireframeProps {
  className?: string;
  strokeColor?: string;
  strokeWidth?: number;
  graticuleOpacity?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  variant?: "wireframe" | "wireframesolid" | "solid";
  scale?: number;
}

interface GeoFeature {
  type: string;
  geometry: GeometryObject;
  properties: Record<string, unknown>;
}

interface WorldAtlasTopology extends Topology {
  objects: { countries: GeometryCollection };
}

function GlobeWireframe({
  className = "aspect-square w-full",
  strokeColor = "currentColor",
  strokeWidth = 0.6,
  graticuleOpacity = 0.12,
  autoRotate = true,
  autoRotateSpeed = 0.45,
  variant = "wireframesolid",
  scale = 1,
}: GlobeWireframeProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [worldData, setWorldData] = useState<GeoFeature[]>([]);
  const [rotation, setRotation] = useState<[number, number]>([50, -20]);
  const [isVisible, setIsVisible] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const animationFrame = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const update = () => {
      const w = container.offsetWidth || 300;
      setDimensions({ width: w, height: w });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    const io = new IntersectionObserver(
      ([e]) => setIsVisible(e.isIntersecting),
      { threshold: 0.1 },
    );
    io.observe(container);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          "/geo/countries-110m.json",
        );
        const world = (await res.json()) as WorldAtlasTopology;
        setWorldData(
          feature(world, world.objects.countries).features as GeoFeature[],
        );
      } catch {
        setWorldData([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!autoRotate || !isVisible) {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
      return;
    }
    const tick = () => {
      setRotation((p) => [(p[0] + autoRotateSpeed) % 360, p[1]]);
      animationFrame.current = requestAnimationFrame(tick);
    };
    animationFrame.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    };
  }, [autoRotate, autoRotateSpeed, isVisible]);

  useEffect(() => {
    if (!svgRef.current || !isVisible) return;
    if (dimensions.width === 0) return;
    const w = dimensions.width;
    const h = dimensions.height;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const projection = d3
      .geoOrthographic()
      .scale((Math.min(w, h) / 2) * scale * 0.9)
      .translate([w / 2, h / 2])
      .rotate([rotation[0], rotation[1]])
      .precision(0.1);
    const path = d3.geoPath().projection(projection);

    if (variant !== "wireframesolid") {
      try {
        const g = d3.geoGraticule();
        const gp = path(g());
        if (gp) {
          svg
            .append("path")
            .datum(g())
            .attr("d", gp)
            .attr("fill", "none")
            .attr("stroke", strokeColor)
            .attr("stroke-width", 1)
            .attr("opacity", graticuleOpacity);
        }
      } catch {
        /* ignore */
      }
    }

    if (worldData.length > 0) {
    svg
      .selectAll(".country")
      .data(worldData)
      .enter()
      .append("path")
      .attr("class", "country")
      .attr("d", (d) => {
        try {
          return path(d as unknown as GeoPermissibleObjects) || "";
        } catch {
          return "";
        }
      })
      .attr("fill", "none")
      .attr("stroke", strokeColor)
      .attr("stroke-width", strokeWidth)
      .attr("opacity", 1);
    }

    try {
      const sphere = path({ type: "Sphere" } as GeoPermissibleObjects);
      if (sphere) {
        svg
          .append("path")
          .datum({ type: "Sphere" })
          .attr("d", sphere)
          .attr("fill", "none")
          .attr("stroke", strokeColor)
          .attr("stroke-width", 1.5)
          .attr("opacity", 0.8);
      }
    } catch {
      /* ignore */
    }
  }, [
    worldData,
    rotation,
    isVisible,
    dimensions,
    strokeColor,
    strokeWidth,
    graticuleOpacity,
    variant,
    scale,
  ]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <svg
        ref={svgRef}
        width={dimensions.width || undefined}
        height={dimensions.height || undefined}
        className="h-full w-full text-secondary"
        style={{ opacity: dimensions.width > 0 ? 1 : 0 }}
      />
    </div>
  );
}

const FormDots = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => {
  const isHorizontal = orientation === "horizontal";
  return (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden",
        isHorizontal ? "w-full" : "h-full",
        className,
      )}
      {...props}
    >
      <div className={cn("relative", isHorizontal ? "h-4 w-full" : "h-full w-4")}>
        <div
          className="absolute inset-0 bg-repeat text-secondary/40"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 0.8px, transparent 0.8px)",
            backgroundSize: isHorizontal ? "6px 100%" : "100% 6px",
            maskImage: isHorizontal
              ? "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)"
              : "linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)",
          }}
        />
      </div>
    </SeparatorPrimitive.Root>
  );
});
FormDots.displayName = "FormDots";

interface ContactWithGlobeProps {
  title?: string;
  subtitle?: string;
  description?: string;
  className?: string;
}

export default function ContactWithGlobe({
  title = "تماس با ما",
  subtitle = "تماس",
  description = "برای پشتیبانی سفارش، مرجوعی و مشاوره خرید با ما در ارتباط باشید.",
  className,
}: ContactWithGlobeProps) {
  return (
    <section
      className={cn(
        "bg-background relative w-full overflow-hidden py-8 md:py-12",
        className,
      )}
      dir="rtl"
    >
      <div className="relative mx-auto w-full max-w-none px-4">
        <div className="mb-8 text-right">
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.15, ease: smoothEase }}
            className="w-full text-right text-2xl md:text-3xl font-iranyekan-heavy text-primary"
          >
            {title}
          </motion.h1>
          {description ? (
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: 0.3, ease: smoothEase }}
              className="text-muted-foreground mt-1 w-full text-right text-sm"
            >
              {description}
            </motion.p>
          ) : null}
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-10 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2, ease: smoothEase }}
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-1">
              <h2 className="text-foreground text-xl font-semibold">ارتباط مستقیم</h2>
              <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
                از طریق ایمیل پیام بگذارید؛ معمولاً در همان روز کاری پاسخ می‌دهیم.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {CONTACT_LINKS.map(({ icon: Icon, label, href }, i) => (
                <motion.a
                  key={label}
                  href={href}
                  initial={{ opacity: 0, x: 12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.5,
                    delay: 0.3 + i * 0.1,
                    ease: smoothEase,
                  }}
                  className="text-muted-foreground hover:text-foreground group flex w-fit items-center gap-3 text-sm transition-roasts duration-200"
                >
                  <div className="border-border bg-muted group-hover:border-secondary/40 group-hover:bg-secondary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-200">
                    <Icon className="text-muted-foreground group-hover:text-secondary h-3.5 w-3.5 transition-roasts duration-200" />
                  </div>
                  {label}
                </motion.a>
              ))}
            </div>

            <div className="relative mt-2 h-64 w-full overflow-hidden sm:h-72">
              <GlobeWireframe
                className="absolute top-0 left-0 aspect-square w-full max-w-full"
                variant="wireframesolid"
                autoRotate
                autoRotateSpeed={0.45}
                strokeWidth={0.6}
                graticuleOpacity={0.12}
              />
              <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t to-transparent" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.35, ease: smoothEase }}
            className="border-border bg-card flex flex-col gap-5 rounded-2xl border p-6 sm:p-8"
          >
            <div>
              <h2 className="text-foreground mb-0.5 text-lg font-semibold">
                ارسال پیام
              </h2>
              <p className="text-muted-foreground text-sm">
                فرم را پر کنید؛ در اسرع وقت پاسخ می‌دهیم.
              </p>
            </div>
            <FormDots />
            <form
              className="flex flex-col gap-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const fd = new FormData(form);
                const res = await fetch("/api/contact", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: String(fd.get("name") || ""),
                    company: String(fd.get("company") || ""),
                    email: String(fd.get("email") || ""),
                    message: String(fd.get("message") || ""),
                  }),
                });
                if (res.ok) {
                  form.reset();
                  alert("پیام شما ثبت شد.");
                } else {
                  alert("ثبت پیام ناموفق بود.");
                }
              }}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    نام کامل
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="نام و نام خانوادگی"
                    className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-secondary focus:ring-secondary/20 w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    شرکت (اختیاری)
                  </label>
                  <input
                    name="company"
                    type="text"
                    placeholder="نام شرکت"
                    className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-secondary focus:ring-secondary/20 w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  ایمیل
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-secondary focus:ring-secondary/20 w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2"
                  dir="ltr"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  پیام
                </label>
                <textarea
                  name="message"
                  required
                  rows={4}
                  placeholder="متن پیام شما…"
                  className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-secondary focus:ring-secondary/20 w-full reweight-none rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2"
                />
              </div>
              <Button
                type="submit"
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90 group h-11 w-fit rounded-xl px-8 text-sm font-semibold"
              >
                ارسال
                <ArrowLeft className="mr-1 h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
              </Button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
