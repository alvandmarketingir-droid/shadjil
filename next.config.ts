import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  // صفحات پنل dynamic می‌مانند؛ فقط overhead کمتر

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-label",
      "@radix-ui/react-slider",
      "@radix-ui/react-slot",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-separator",
      "@radix-ui/react-navigation-menu",
      "date-fns",
      "date-fns-jalali",
      "framer-motion",
      "embla-carousel-react",
      "lucide-react",
    ],
  },

  // Next 16+: eslint key removed from next.config (use `npm run lint` / eslint.config.mjs)
  // Typecheck path (T-9): keep ignore until `npm run typecheck` is green; CI tracks count.
  typescript: { ignoreBuildErrors: true },

  async headers() {
    return [
      {
        source: "/hero/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://media.pirahanmardane.ir https://*.supabase.co https://*.r2.dev https://placehold.co",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://rest.payamak-panel.com",
              "media-src 'self' https://media.pirahanmardane.ir",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      { source: "/علاقه-مندی-ها", destination: "/dashboard?tab=wishlist" },
      { source: "/مقایسه", destination: "/dashboard?tab=compare" },
      { source: "/سبد-خرید", destination: "/cart" },
      { source: "/آخرین-مشاهده-ها", destination: "/dashboard?tab=recent" },
      { source: "/محصولات", destination: "/products" },
      { source: "/ورود", destination: "/login" },
      { source: "/%D9%88%D8%B1%D9%88%D8%AF", destination: "/login" },
      { source: "/ثبت-نام", destination: "/register" },
      { source: "/%D8%AB%D8%A8%D8%AA-%D9%86%D8%A7%D9%85", destination: "/register" },
    ];
  },

  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "media.pirahanmardane.ir",
      },
      {
        protocol: "https",
        hostname: "**.r2.dev",
      },
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
