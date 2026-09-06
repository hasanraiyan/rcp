"use client";

import { usePathname } from "next/navigation";
import { flatDocsNav } from "@/lib/docs-nav";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rcp.hasanraiyan.me";

export function DocsBreadcrumbJsonLd() {
  const pathname = usePathname() ?? "/docs";

  // Base breadcrumb always Home > Docs
  const items: { name: string; item: string }[] = [
    { name: "Home", item: SITE_URL },
    { name: "Docs", item: `${SITE_URL}/docs` },
  ];

  if (pathname !== "/docs") {
    const navItem = flatDocsNav.find((n) => n.href === pathname);
    const label = navItem?.title ?? pathname.split("/").pop()?.replace(/-/g, " ") ?? pathname;
    // Title-case fallback
    const title = label.charAt(0).toUpperCase() + label.slice(1);
    items.push({ name: title, item: `${SITE_URL}${pathname}` });
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      item: it.item,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
