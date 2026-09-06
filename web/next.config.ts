import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Google-InspectionTool sees consistent, crawlable URLs
  trailingSlash: false,
  poweredByHeader: false,
  async headers() {
    return [
      {
        // HTML pages: cache with revalidation, never block indexing via header
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // Static assets: long cache, immutable
        source: "/(.*)\\.(js|css|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
