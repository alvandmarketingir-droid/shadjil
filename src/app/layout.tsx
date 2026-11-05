import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";
import { AppToaster } from "@/components/ui/app-toaster";
import { DeferredRealtime } from "@/components/providers/deferred-realtime";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationSchema, websiteSchema } from "@/lib/seo/schema";
import { isSiteIndexable } from "@/lib/seo/indexing";
import { WebVitalsReporter } from "@/components/performance/web-vitals-reporter";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pirahanmardane.ir";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "پیراهن مردانه | فروشگاه تخصصی پیراهن مردانه",
    template: "%s | پیراهن مردانه",
  },
  description:
    "فروشگاه تخصصی پیراهن مردانه — پیراهن رسمی، اسپرت، کروات، پاپیون و اکسسوری مردانه",
  applicationName: "پیراهن مردانه",
  authors: [{ name: "پیراهن مردانه" }],
  generator: "Next.js",
  keywords: [
    "پیراهن مردانه",
    "پیراهن رسمی",
    "پیراهن اسپرت",
    "کروات",
    "پاپیون",
    "دکمه سردست",
  ],
  manifest: "/site.webmanifest",
  appleWebApp: {
    title: "پیراهن مردانه",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.png", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: siteUrl,
    siteName: "پیراهن مردانه",
    title: "پیراهن مردانه | فروشگاه تخصصی پیراهن مردانه",
    description:
      "فروشگاه تخصصی پیراهن مردانه — پیراهن رسمی، اسپرت، کروات، پاپیون و اکسسوری",
    images: [
      {
        url: "/og-image.webp",
        width: 1200,
        height: 630,
        alt: "پیراهن مردانه",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "پیراهن مردانه | فروشگاه تخصصی پیراهن مردانه",
    description:
      "فروشگاه تخصصی پیراهن مردانه — پیراهن رسمی، اسپرت، کروات، پاپیون و اکسسوری",
    images: ["/og-image.webp"],
  },
  robots: isSiteIndexable()
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
        },
      }
    : {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
          noimageindex: true,
        },
      },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning className="max-w-full">
      <head>
        <link rel="preconnect" href="https://media.pirahanmardane.ir" crossOrigin="" />
        <link rel="dns-prefetch" href="https://media.pirahanmardane.ir" />
        <link
          rel="preload"
          as="font"
          href="/fonts/iranyekan/IRANYekanX-Regular.woff2"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          href="/fonts/iranyekan/IRANYekanX-Bold.woff2"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          href="/fonts/iranyekan/IRANYekanX-Thin.woff2"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          as="font"
          href="/fonts/iranyekan/IRANYekanX-Heavy.woff2"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="icon" href="/icon.png" type="image/png" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="apple-mobile-web-app-title" content="پیراهن مردانه" />
        <meta name="application-name" content="پیراهن مردانه" />
        <meta name="theme-color" content="#023047" />
      </head>
      <body className="min-h-screen font-sans antialiased max-w-full" suppressHydrationWarning>
        <JsonLd data={[organizationSchema(), websiteSchema()]} />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          storageKey="pm-theme"
          disableTransitionOnChange
        >
          {children}
          <Toaster theme="light" position="top-left" richColors closeButton />
          <DeferredRealtime />
          <AppToaster />
          <WebVitalsReporter />
        </ThemeProvider>
      </body>
    </html>
  );
}
