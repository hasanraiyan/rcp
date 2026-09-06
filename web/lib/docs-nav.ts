export type DocsNavItem = {
  title: string;
  href: string;
};

export type DocsNavGroup = {
  title: string | null;
  items: DocsNavItem[];
};

export const docsNav: DocsNavGroup[] = [
  {
    title: null,
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "Getting started", href: "/docs/getting-started" },
      { title: "Full spec", href: "/docs/spec" },
    ],
  },
  {
    title: "Concepts",
    items: [
      { title: "The manifest", href: "/docs/concepts/manifest" },
      { title: "Resolvers", href: "/docs/concepts/resolvers" },
      { title: "Auth", href: "/docs/concepts/auth" },
    ],
  },
  {
    title: "Guides",
    items: [
      { title: "Secure tenant isolation", href: "/docs/guides/secure-tenant-isolation" },
    ],
  },
  {
    title: "SDK reference",
    items: [
      { title: "Client — rcp-sdk/client", href: "/docs/sdk/client" },
      { title: "Server — rcp-sdk/server", href: "/docs/sdk/server" },
      { title: "OpenAI — rcp-sdk/adapters/openai", href: "/docs/sdk/openai" },
      { title: "LangChain — rcp-sdk/adapters/langchain", href: "/docs/sdk/langchain" },
      { title: "Gemini — rcp-sdk/adapters/gemini", href: "/docs/sdk/gemini" },
    ],
  },
  {
    title: null,
    items: [
      { title: "Examples", href: "/docs/examples" },
      { title: "RCP vs MCP", href: "/docs/vs-mcp" },
      { title: "Roadmap", href: "/docs/roadmap" },
    ],
  },
];

export const flatDocsNav: DocsNavItem[] = docsNav.flatMap((group) => group.items);
