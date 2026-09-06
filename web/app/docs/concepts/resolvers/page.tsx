import type { Metadata } from "next";
import { DocPage } from "@/components/docs/doc-page";
import { CodeBlock, Callout } from "@/components/docs/code-block";

export const metadata: Metadata = {
  title: "Resolvers — Hide Tenant ID & User ID from the LLM",
  description:
    "Resolver-bound params never reach the model — stripped at discovery, filled from trusted context at call time. Secure tenantId, userId, and internal IDs from LLM spoofing.",
  keywords: [
    "RCP resolvers",
    "resolver-bound parameters",
    "hide param from LLM",
    "tenant ID LLM security",
    "userId hidden from model",
    "LLM parameter injection prevention",
  ],
  alternates: { canonical: "/docs/concepts/resolvers" },
};

export default function ResolversPage() {
  const techArticleJsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "Resolvers — Hide Tenant ID & User ID from the LLM",
    description: "Resolver-bound params stripped from exposedParams at discovery, filled from trusted context at call time — secure tenantId from LLM spoofing.",
    author: { "@type": "Person", name: "Raiyan Hasan", url: "https://hasanraiyan.me" },
    datePublished: "2026-09-06",
    dateModified: "2026-09-06",
    keywords: "RCP resolvers, resolver-bound parameters, hide param from LLM, tenant ID security",
    mainEntityOfPage: "https://rcp.hasanraiyan.me/docs/concepts/resolvers",
  };


  return (
    <DocPage
      title="Resolvers"
      description="A resolver-bound param never reaches the model — it's removed from the tool schema at discovery time, not just hidden by convention."
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticleJsonLd) }} />
      <p>
        A tool often needs a value that shouldn&rsquo;t come from the model at all: which end user
        is asking, which tenant they belong to, a locale — anything the client&rsquo;s own operator
        already knows and the model would otherwise have to guess, or could spoof.
      </p>
      <p>
        <strong>Nothing is declared in the manifest.</strong> A param like <code>learnerId</code> is
        written exactly like any other model-fillable param — the server doesn&rsquo;t tag it,
        doesn&rsquo;t need a reserved name, and doesn&rsquo;t need to know whether some client
        intercepts it. The mechanism lives entirely on the client.
      </p>

      <h2>Configuring one</h2>
      <CodeBlock
        lang="typescript"
        code={`const client = createRcpClient({
  resolvers: {
    // fills a declared {{learnerId}} param before the model ever sees
    // the tool's schema — the model has no argument to fill for it
    learnerId: (ctx) => ctx.currentUserId,
  },
});`}
      />

      <h2>What happens at each step</h2>
      <ul>
        <li>
          <strong>Discovery</strong> — the client removes every param it has a registered resolver
          for before the tool schema is shown to the model. Structurally unfillable, not just
          discouraged.
        </li>
        <li>
          <strong>Execution</strong> — the client calls the resolver to get the real value and
          substitutes it into the request before the server ever sees it.
        </li>
        <li>
          <strong>No value to resolve</strong> — a resolver with nothing to resolve from (no
          verified caller behind this turn, say) fails the call before any HTTP request goes out.
        </li>
      </ul>

      <h2>Seeing what a server is asking for</h2>
      <p>
        <code>describeManifest()</code> is the programmatic way to check, before wiring a server
        into a live agent, which params it declares and which of those you already have a resolver
        for:
      </p>
      <CodeBlock
        lang="typescript"
        code={`import { createRcpClient, describeManifest } from 'rcp-sdk/client';

const client = createRcpClient({ resolvers: { userId: (ctx) => ctx.currentUserId } });
const { manifest, tools } = await client.discover('https://example.com/rcp/manifest');

console.log(describeManifest(manifest, tools));
// RCP manifest v0.1 — auth: header "Authorization" (scheme: Bearer)
// 1 tool(s):
//   - get_profile (GET) — Get the current user's profile.
//       userId: string, required [resolved by client, hidden from model] — the user's id`}
      />

      <Callout>
        This is deliberately general-purpose — the same mechanism covers end-user identity, a tenant
        id, a region, or anything else an operator wants auto-filled. A client that never configures
        a resolver for a given param just shows it to the model as an ordinary fillable argument —
        there&rsquo;s no protocol-level signal warning otherwise. A server&rsquo;s{" "}
        <code>description</code> on that param is the only hint a client operator gets.
      </Callout>

      <h2>Related</h2>
      <ul>
        <li>
          <a href="/docs/concepts/manifest">The manifest — JSON directory of AI tools</a>
        </li>
        <li>
          <a href="/docs/sdk/client">rcp-sdk/client — resolver config in createRcpClient()</a>
        </li>
        <li>
          <a href="/docs/vs-mcp">RCP vs MCP — why resolvers have no MCP equivalent</a>
        </li>
        <li>
          <a href="/docs/getting-started">Getting started — expose REST API to AI</a>
        </li>
      </ul>
    </DocPage>
  );
}
