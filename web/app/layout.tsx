import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const plexMono = IBM_Plex_Mono({
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
  openGraph: {
    type: "website",
    url: "/",
    siteName: "RCP — REST Connector Protocol",
    title: "RCP — REST Connector Protocol",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "RCP — REST Connector Protocol",
    description: SITE_DESCRIPTION,
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", plexSans.variable, plexMono.variable, "font-sans")}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
