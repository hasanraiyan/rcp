import Link from "next/link";
import { VersionBadge } from "@/components/docs/version-badge";
import { InView } from "@/components/home/in-view";
import { cn } from "@/lib/utils";

const REPO = "https://github.com/hasanraiyan/rcp";

type Method = "GET" | "POST";

const METHOD_CLASS: Record<Method, string> = {
  GET: "text-method-get",
  POST: "text-method-post",
};

function MethodTag({ method }: { method: Method }) {
  return <span className={cn("font-semibold", METHOD_CLASS[method])}>{method}</span>;
}

function StatusPill({ code, animate = false }: { code: number; animate?: boolean }) {
  const tone = code >= 400 ? "bg-method-delete/10 text-method-delete" : "bg-method-post/10 text-method-post";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[13px] font-semibold",
        tone,
        animate && "rcp-anim-ping",
      )}
    >
      {code}
    </span>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const className = "text-sm text-muted-foreground transition-colors hover:text-foreground";
  if (!href.startsWith("http")) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  name: "RCP — REST Connector Protocol",
  description:
    "A lightweight, open protocol for exposing REST APIs as AI-callable tools — without running a protocol server.",
  codeRepository: REPO,
  programmingLanguage: "TypeScript",
  author: {
    "@type": "Person",
    name: "Raiyan Hasan",
    url: "https://hasanraiyan.me",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is RCP?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "RCP (REST Connector Protocol) is a lightweight, open protocol for exposing REST APIs as AI-callable tools — without running a protocol server. A server publishes a manifest; a client fetches it and calls the endpoints directly.",
      },
    },
    {
      "@type": "Question",
      name: "How is RCP different from MCP?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "MCP requires a persistent session and dedicated protocol server for rich, stateful capabilities. RCP is stateless HTTP — your existing REST API plus one manifest route. Use RCP when you already have endpoints to expose; use MCP for resources, prompts, and elicitation.",
      },
    },
    {
      "@type": "Question",
      name: "How do I get started with RCP?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Install rcp-sdk via npm i rcp-sdk, define tools with defineTool() on the server, serve a manifest at /manifest, then discover and call from the client with createRcpClient().",
      },
    },
  ],
};

const HERO_LINES: { delay: string }[] = [
  { delay: "0.05s" },
  { delay: "0.16s" },
  { delay: "0.28s" },
  { delay: "0.42s" },
  { delay: "0.6s" },
  { delay: "0.78s" },
];

const STEPS = [
  {
    n: "1",
    title: "Discovery",
    body: "The client fetches the manifest URL once per session. The server returns its rcpVersion, auth mode, and tool list.",
  },
  {
    n: "2",
    title: "Selection",
    body: "The model sees only exposedParams — anything bound to a resolver was already stripped from the schema.",
  },
  {
    n: "3",
    title: "Execution",
    body: "The client fills resolver-bound params from ctx, renders the request, and calls the tool's own URL directly.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary" aria-hidden />
            <span className="text-[15px] font-semibold tracking-tight">RCP</span>
            <VersionBadge />
          </Link>
          <nav className="flex items-center gap-6">
            <NavLink href="/docs">Docs</NavLink>
            <NavLink href="/docs/spec">Spec</NavLink>
            <NavLink href={REPO}>GitHub</NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto w-full max-w-5xl px-6 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="grid gap-14 md:grid-cols-2 md:items-center">
            <div className="max-w-md">
              <h1 className="rcp-anim-rise text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-balance">
                Your REST API is already the tool.
              </h1>
              <p
                className="rcp-anim-rise mt-5 text-base leading-7 text-muted-foreground"
                style={{ animationDelay: "0.1s" }}
              >
                RCP is a lightweight, open protocol for exposing REST endpoints as AI-callable tools
                — no protocol server, no persistent connection. A server publishes a manifest; a
                client fetches it and calls the endpoints directly.
              </p>
              <div
                className="rcp-anim-rise mt-8 flex flex-wrap items-center gap-3"
                style={{ animationDelay: "0.2s" }}
              >
                <Link
                  href="/docs/getting-started"
                  className="inline-flex h-10 items-center rounded-sm bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
                >
                  Read the docs
                </Link>
                <code className="inline-flex h-10 items-center gap-2 rounded-sm border border-border bg-card px-4 font-mono text-sm text-foreground">
                  <span className="text-muted-foreground">$</span> npm i rcp-sdk
                </code>
              </div>
            </div>

            <div className="rounded-sm border border-border bg-card p-5 font-mono text-[13px] leading-6">
              <div className="rcp-anim-rise" style={{ animationDelay: HERO_LINES[0].delay }}>
                <MethodTag method="GET" />{" "}
                <span className="text-muted-foreground">/manifest</span>
                <span className="float-right">
                  <StatusPill code={200} animate />
                </span>
              </div>
              <div
                className="rcp-anim-rise mt-1 text-muted-foreground"
                style={{ animationDelay: HERO_LINES[1].delay }}
              >
                {'{ rcpVersion: "0.1", tools: […] }'}
              </div>

              <div
                className="rcp-anim-rise my-4 border-t border-dashed border-border"
                style={{ animationDelay: HERO_LINES[2].delay }}
              />

              <div
                className="rcp-cursor rcp-anim-rise text-muted-foreground"
                style={{ animationDelay: HERO_LINES[3].delay }}
              >
                {'// model picks create_order, supplies { item: "sku_88" }'}
              </div>

              <div
                className="rcp-anim-rise mt-4"
                style={{ animationDelay: HERO_LINES[4].delay }}
              >
                <MethodTag method="POST" />{" "}
                <span className="text-muted-foreground">https://api.acme.dev/orders</span>
                <span className="float-right">
                  <StatusPill code={200} />
                </span>
              </div>
              <div
                className="rcp-anim-rise mt-1 text-muted-foreground"
                style={{ animationDelay: HERO_LINES[5].delay }}
              >
                {'{ id: "ord_193", status: "confirmed" }'}
              </div>
            </div>
          </div>
        </section>

        {/* The shape of it */}
        <section className="border-t border-border">
          <div className="mx-auto grid w-full max-w-5xl gap-10 px-6 py-16 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:py-20">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">The shape of it</h2>
              <p className="mt-4 max-w-sm text-[15px] leading-7 text-muted-foreground">
                Two roles, no third &ldquo;host&rdquo; layer, no persistent connection — every
                interaction is a plain, stateless HTTP request. Discovery and execution even hit
                different places: the manifest is only ever a directory, and the model&rsquo;s tool
                call goes straight to the tool&rsquo;s own URL.
              </p>
            </div>

            <InView className="relative">
              <div
                className="rcp-wire-line absolute top-2 bottom-2 left-[7px] w-px bg-border"
                aria-hidden
              />
              <ol className="space-y-10">
                {STEPS.map((step, i) => (
                  <li key={step.n} className="relative flex gap-5 pl-8">
                    <span
                      className="rcp-wire-dot absolute top-0.5 left-0 size-3.5 rounded-full border-2 border-signal bg-background"
                      style={{ "--dot-delay": `${0.15 + i * 0.28}s` } as React.CSSProperties}
                      aria-hidden
                    />
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{step.n}</span>
                        <span className="font-medium">{step.title}</span>
                      </div>
                      <p className="mt-1 text-[15px] leading-6 text-muted-foreground">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </InView>
          </div>
        </section>

        {/* Comparison */}
        <section className="border-t border-border bg-secondary/50">
          <div className="mx-auto w-full max-w-5xl px-6 py-16 md:py-20">
            <h2 className="text-xl font-semibold tracking-tight">When it&rsquo;s not MCP</h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-muted-foreground">
              If MCP is the right fit when you need rich, stateful capabilities, RCP is for the much
              more common case: you already have a REST API, and you just want an AI application to
              call some of its endpoints as tools.
            </p>

            <div className="mt-8 overflow-x-auto rounded-sm border border-border bg-card">
              <table className="w-full min-w-[520px] border-collapse text-left text-[15px]">
                <thead>
                  <tr className="border-b border-border text-sm text-muted-foreground">
                    <th className="py-3 pr-6 pl-5 font-medium"></th>
                    <th className="py-3 pr-6 font-medium">RCP</th>
                    <th className="py-3 pr-5 font-medium">MCP</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Connection", "Stateless HTTP request", "Persistent session"],
                    ["Server", "Your existing REST API", "A dedicated protocol server"],
                    [
                      "Best fit",
                      "You already have endpoints to expose",
                      "Rich, stateful capabilities",
                    ],
                  ].map((row) => (
                    <tr key={row[0]} className="border-b border-border last:border-0">
                      <td className="py-3 pr-6 pl-5 text-muted-foreground">{row[0]}</td>
                      <td className="py-3 pr-6">{row[1]}</td>
                      <td className="py-3 pr-5 text-muted-foreground">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Resolvers */}
        <section className="border-t border-border">
          <div className="mx-auto grid w-full max-w-5xl gap-10 px-6 py-16 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:py-20">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Params the model never sees</h2>
              <p className="mt-4 max-w-sm text-[15px] leading-7 text-muted-foreground">
                A resolver-bound param never reaches the model — it&rsquo;s removed from the tool
                schema at discovery time, not just hidden by convention. Use it for a tenant ID, an
                internal user ID, anything the model shouldn&rsquo;t supply or even see.
              </p>
              <Link
                href="/docs/concepts/resolvers"
                className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
              >
                Read more about resolvers
              </Link>
            </div>

            <div className="rounded-sm border border-border bg-card p-5 font-mono text-[13px] leading-6">
              <div className="text-muted-foreground">{"// server declares the resolver"}</div>
              <div className="mt-1">
                tenantId: <span className="text-signal">resolver</span>(ctx =&gt; ctx.tenantId)
              </div>
              <div className="my-4 border-t border-dashed border-border" />
              <div className="text-muted-foreground">{"// what the model is offered"}</div>
              <div className="mt-1">
                {'{ tool: "list_orders", exposedParams: ["status", "limit"] }'}
              </div>
            </div>
          </div>
        </section>

        {/* SDKs */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-5xl px-6 py-16 md:py-20">
            <h2 className="text-xl font-semibold tracking-tight">SDKs</h2>
            <div className="mt-8 flex flex-col justify-between gap-4 rounded-sm border border-border bg-card p-5 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">rcp-sdk</span>
                  <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
                    TypeScript
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  The reference implementation. Client and server, same package.
                </p>
              </div>
              <Link
                href="/docs/sdk/client"
                className="inline-flex h-9 items-center rounded-sm border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
              >
                View SDK docs
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              More languages land the same way — self-contained, own package manifest, own tests.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div>RCP v0.2.0 — in active design.</div>
            <div>
              Built by{" "}
              <a
                href="https://hasanraiyan.me"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:text-primary"
              >
                Raiyan Hasan
              </a>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <NavLink href="/docs">Docs</NavLink>
            <NavLink href="/docs/spec">Spec</NavLink>
            <NavLink href="/docs/roadmap">Roadmap</NavLink>
            <NavLink href={`${REPO}/blob/master/LICENSE`}>License</NavLink>
            <NavLink href={REPO}>GitHub</NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
