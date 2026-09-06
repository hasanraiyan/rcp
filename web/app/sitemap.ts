import type { MetadataRoute } from "next";
import { flatDocsNav } from "@/lib/docs-nav";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rcp.hasanraiyan.me";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];

  const docsRoutes: MetadataRoute.Sitemap = flatDocsNav.map((item) => ({
    url: `${SITE_URL}${item.href}`,
    changeFrequency: "weekly",
    priority: item.href === "/docs" ? 0.9 : 0.7,
  }));

  return [...staticRoutes, ...docsRoutes];
}
