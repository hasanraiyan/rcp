import type { Metadata } from "next";
import { Public_Sans, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rcp.hasanraiyan.me";
const SITE_DESCRIPTION =
  "A lightweight, open protocol for exposing REST APIs as AI-callable tools — without running a protocol server. Compare RCP vs MCP, read the spec, and get started with rcp-sdk.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "RCP — REST Connector Protocol",
    template: "%s — RCP",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "RCP",
    "REST Connector Protocol",
    "MCP",
    "Model Context Protocol",
    "AI tools",
    "REST API",
    "LLM tool calling",
    "function calling",
    "rcp-sdk",
    "AI agent protocol",
  ],
  authors: [{ name: "Raiyan Hasan", url: "https://hasanraiyan.me" }],
  creator: "Raiyan Hasan",
  publisher: "Raiyan Hasan",
  category: "Technology",
  // Explicit index/follow helps Live Test show Indexing allowed: Yes
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Add NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION env to verify Search Console ownership
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
  openGraph: {
    type: "website",
    url: "/",
    siteName: "RCP — REST Connector Protocol",
    title: "RCP — REST Connector Protocol",
    description: SITE_DESCRIPTION,
    locale: "en_US",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "RCP — Your REST API is already the tool.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RCP — REST Connector Protocol",
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        publicSans.variable,
        jetbrainsMono.variable,
        "font-sans",
      )}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
