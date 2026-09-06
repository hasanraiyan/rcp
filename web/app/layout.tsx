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
  "Expose your existing REST API as AI-callable tools without running an MCP server. Lightweight alternative to Model Context Protocol for OpenAI, LangChain & Gemini tool calling — just a manifest + plain HTTP. Start with rcp-sdk.";

// Google-searchable keyword clusters — keep in priority order (most important first)
// Cluster 1: Brand | 2: Primary intent (expose REST to AI) | 3: MCP comparison | 4: Tool/function calling | 5: Framework adapters | 6: Long-tail
const SITE_KEYWORDS = [
  // Brand / core
  "RCP",
  "REST Connector Protocol",
  "rcp-sdk",
  "RCP protocol",
  // Primary intent — what devs actually type into Google
  "expose REST API to AI",
  "turn REST API into AI tools",
  "connect REST API to LLM",
  "REST API to AI agent",
  "make REST API callable by AI",
  "expose existing API as AI tool",
  "REST API AI integration",
  "AI callable REST endpoints",
  // MCP comparison — highest volume 2025-2026
  "MCP alternative",
  "lightweight alternative to MCP",
  "RCP vs MCP",
  "MCP vs REST API",
  "Model Context Protocol alternative",
  "without MCP server",
  "no protocol server",
  // Tool / function calling
  "LLM tool calling",
  "OpenAI function calling",
  "OpenAI tool calling",
  "function calling REST API",
  "AI tool calling protocol",
  "AI agent tools",
  "LLM function calling tutorial",
  // Framework adapters
  "OpenAI tools adapter",
  "LangChain tools",
  "LangChain DynamicStructuredTool",
  "Gemini function calling",
  "Google GenAI tools",
  "Vercel AI SDK tools",
  "Express REST API AI",
  // Technical long-tail
  "stateless HTTP AI protocol",
  "REST API manifest for AI",
  "AI agent REST API protocol",
  "resolver bound parameters",
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "RCP — REST Connector Protocol | Your REST API is Already the Tool",
    template: "%s — RCP",
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
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
    title: "RCP — REST Connector Protocol | Expose REST API as AI Tools Without MCP Server",
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
    title: "RCP — REST Connector Protocol | Expose REST API as AI Tools",
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
