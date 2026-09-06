import type { MetadataRoute } from "next";
import { flatDocsNav } from "@/lib/docs-nav";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rcp.hasanraiyan.me";

// Stable lastModified so Google can trust `lastmod` for incremental crawl.
// Bump this date when content actually changes, or wire to git commit date in CI.
const LAST_MODIFIED = new Date("2026-09-06");

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];

  const docsRoutes: MetadataRoute.Sitemap = flatDocsNav.map((item) => ({
    url: `${SITE_URL}${item.href}`,
    lastModified: LAST_MODIFIED,
    changeFrequency: "weekly",
    priority: item.href === "/docs" ? 0.9 : 0.7,
  }));

  return [...staticRoutes, ...docsRoutes];
}
