const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://shadjil.ir").replace(/\/$/, "");

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE}/#organization`,
    name: "شادجیل",
    url: SITE,
    logo: {
      "@type": "ImageObject",
      url: `${SITE}/icon.png`,
    },
    sameAs: [] as string[],
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE}/#website`,
    url: SITE,
    name: "شادجیل",
    inLanguage: "fa-IR",
    publisher: { "@id": `${SITE}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE}/products?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export type BreadcrumbItem = { name: string; url: string };

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url.startsWith("http") ? it.url : `${SITE}${it.url.startsWith("/") ? "" : "/"}${it.url}`,
    })),
  };
}

export function productSchema(input: {
  name: string;
  slug: string;
  description?: string | null;
  images?: string[];
  sku?: string | null;
  brandName?: string | null;
  price?: number | null;
  currency?: string;
  availability?: "InStock" | "OutOfStock" | "PreOrder";
  categoryName?: string | null;
}) {
  const url = `${SITE}/products/${input.slug}`;
  const offers =
    input.price != null && Number.isFinite(input.price)
      ? {
          "@type": "Offer",
          url,
          priceCurrency: input.currency ?? "IRR",
          price: String(Math.round(input.price)),
          availability: `https://schema.org/${input.availability ?? "InStock"}`,
          itemCondition: "https://schema.org/NewCondition",
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description || undefined,
    image: input.images?.length ? input.images : undefined,
    sku: input.sku || undefined,
    brand: input.brandName
      ? { "@type": "Brand", name: input.brandName }
      : undefined,
    category: input.categoryName || undefined,
    url,
    offers,
  };
}

export function articleSchema(input: {
  title: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  datePublished?: string | null;
  dateModified?: string | null;
  authorName?: string;
}) {
  const url = `${SITE}/blog/${input.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description || undefined,
    image: input.image || undefined,
    datePublished: input.datePublished || undefined,
    dateModified: input.dateModified || input.datePublished || undefined,
    author: {
      "@type": "Person",
      name: input.authorName || "شادجیل",
    },
    publisher: {
      "@type": "Organization",
      name: "شادجیل",
      logo: {
        "@type": "ImageObject",
        url: `${SITE}/icon.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    inLanguage: "fa-IR",
  };
}

export function collectionPageSchema(input: {
  name: string;
  description?: string | null;
  url: string;
}) {
  const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://shadjil.ir").replace(/\/$/, "");
  const url = input.url.startsWith("http") ? input.url : `${SITE}${input.url.startsWith("/") ? "" : "/"}${input.url}`;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description || undefined,
    url,
    isPartOf: { "@id": `${SITE}/#website` },
  };
}

export function brandPageSchema(input: {
  name: string;
  description?: string | null;
  slug: string;
  logo?: string | null;
}) {
  const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://shadjil.ir").replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "Brand",
    name: input.name,
    description: input.description || undefined,
    url: `${SITE}/brands/${input.slug}`,
    logo: input.logo || undefined,
  };
}

export function faqPageSchema(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}
