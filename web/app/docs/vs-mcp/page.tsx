import type { Metadata } from "next";
import { DocPage } from "@/components/docs/doc-page";

export const metadata: Metadata = {
  title: "RCP vs MCP — Lightweight Alternative to Model Context Protocol",
  description:
    "RCP vs MCP compared: when to use RCP's stateless HTTP manifest vs MCP's stateful server. Decision checklist for exposing REST APIs to AI without a protocol server.",
  keywords: [
    "RCP vs MCP",
    "MCP alternative",
    "lightweight alternative to MCP",
    "MCP vs REST API",
    "Model Context Protocol vs RCP",
    "do I need MCP",
    "MCP comparison 2026",
    "stateless vs stateful AI protocol",
  ],
  alternates: { canonical: "/docs/vs-mcp" },
};

export default function VsMcpPage() {
  const techArticleJsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "RCP vs MCP — Lightweight Alternative to Model Context Protocol",
    description:
      "Compare RCP stateless HTTP manifest vs MCP persistent server. Decision guide for exposing REST APIs as AI tools without a protocol server.",
    author: { "@type": "Person", name: "Raiyan Hasan", url: "https://hasanraiyan.me" },
    datePublished: "2026-09-06",
    dateModified: "2026-09-06",
    keywords: "RCP vs MCP, MCP alternative, lightweight MCP alternative, MCP vs REST API",
    mainEntityOfPage: "https://rcp.hasanraiyan.me/docs/vs-mcp",
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "When should I use RCP instead of MCP?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Use RCP when you already have a REST API and just want an AI to call some of its endpoints as tools, without running a separate protocol server. Every call is a stateless HTTP request.",
        },
      },
      {
        "@type": "Question",
        name: "When should I use MCP instead of RCP?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Use MCP when you need rich, stateful capabilities — resources, prompt templates, elicitation, sampling, or a long-lived session.",
        },
      },
      {
        "@type": "Question",
        name: "Is RCP a replacement for MCP?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. RCP is a narrower protocol for a narrower, much more common case: exposing existing REST endpoints as tools. If you outgrow that, MCP is the right fit.",
        },
      },
    ],
  };

  return (
    <DocPage
      title="RCP vs MCP"
      description="Not a replacement for MCP — a narrower protocol for a narrower, much more common case."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <p>
        MCP is the right answer when you want rich, stateful capabilities — resources a user
        browses, prompts a user picks, elicitation or sampling mid-call, a long-lived connection.
        That power has a cost: implementing an MCP server means implementing JSON-RPC, a transport,
        and the base protocol&rsquo;s negotiation flow, even if all you actually have is &ldquo;call
        this REST endpoint with this shape.&rdquo;
      </p>
      <p>
        RCP is deliberately not trying to be MCP-but-open-source. It&rsquo;s for the much narrower
        case:{" "}
        <strong>
          &ldquo;I have a REST API. I want an AI application to call some of its endpoints as tools,
          and I don&rsquo;t want to run anything besides my existing API plus one more route that
          returns JSON.&rdquo;
        </strong>{" "}
        If you outgrow that, reach for MCP instead — that&rsquo;s a real signal, not a gap RCP tries
        to fill.
      </p>

      <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th></th>
            <th>RCP</th>
            <th>MCP</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Connection</td>
            <td>Stateless HTTP request</td>
            <td>Persistent session</td>
          </tr>
          <tr>
            <td>Roles</td>
            <td>Client, Server</td>
            <td>Host, Client, Server</td>
          </tr>
          <tr>
            <td>Transport</td>
            <td>Plain HTTP</td>
            <td>JSON-RPC over stdio or Streamable HTTP</td>
          </tr>
          <tr>
            <td>Server requirement</td>
            <td>Your existing REST API, or a static JSON file</td>
            <td>A dedicated protocol server</td>
          </tr>
          <tr>
            <td>Hiding a param from the model</td>
            <td>Resolvers — a client-side mechanism, nothing declared on the wire</td>
            <td>
              No equivalent — <code>inputSchema</code> is plain JSON Schema, every property is
              model-fillable
            </td>
          </tr>
          <tr>
            <td>Resources / Prompts / Sampling / Elicitation</td>
            <td>Out of scope for v0.1</td>
            <td>Supported</td>
          </tr>
          <tr>
            <td>Best fit</td>
            <td>You already have endpoints to expose</td>
            <td>Rich, stateful capabilities</td>
          </tr>
        </tbody>
      </table>
      </div>

      <h2>When to use RCP</h2>
      <ul>
        <li>
          You already have a REST API and just want a model to call a handful of its endpoints.
        </li>
        <li>
          You don&rsquo;t want to stand up or operate a separate protocol server — the manifest can
          be one more route on the API you already run, or even a static JSON file behind a CDN.
        </li>
        <li>
          Every call is naturally one-shot: fetch, call, get a response back. Nothing needs the
          model to browse a list of resources or pick from prompt templates mid-conversation.
        </li>
        <li>
          You need to keep a value — a tenant id, the current user, an internal key — completely out
          of the model&rsquo;s hands. That&rsquo;s what{" "}
          <a href="/docs/concepts/resolvers">resolvers</a> are for.
        </li>
        <li>
          You want any client to be able to integrate by reading JSON, with no SDK dependency
          required on the server side at all.
        </li>
      </ul>

      <h2>When to use MCP instead</h2>
      <ul>
        <li>
          The model needs to browse resources (files, records, search results) as a distinct concept
          from calling a function.
        </li>
        <li>
          You want to offer prompt templates the user selects, not just tools the model invokes.
        </li>
        <li>
          A call needs to pause mid-flight and ask the user something (elicitation), or the server
          needs to sample the model itself.
        </li>
        <li>
          The integration benefits from a long-lived, stateful session rather than independent
          stateless requests.
        </li>
      </ul>

      <h2>What RCP borrows from MCP on purpose</h2>
      <ul>
        <li>
          The same three auth tiers — <code>none</code>, <code>header</code>, <code>oauth2</code> —
          and the same RFC stack for <code>oauth2</code>, so a client that already speaks
          MCP&rsquo;s OAuth flow needs no new logic to also speak RCP&rsquo;s.
        </li>
        <li>
          The same security posture: registration is consent, tool descriptions are untrusted
          content, secrets are client-side only.
        </li>
        <li>The same explicit-over-implicit stance on version negotiation.</li>
      </ul>

      <h2>What&rsquo;s explicitly out of scope for v0.1</h2>
      <ul>
        <li>
          Resources, Prompts, Sampling, Elicitation, Roots — if real demand shows up, these would be
          additive, opt-in extensions layered on the same manifest+HTTP model, not a rewrite of it.
        </li>
        <li>
          A bidirectional/streaming transport. Every RCP interaction is a plain request/response
          over HTTPS.
        </li>
        <li>
          A server-side SDK requirement. The spec is fully defined by &ldquo;does{" "}
          <code>GET &lt;manifest-url&gt;</code> return valid JSON matching the schema.&rdquo;
        </li>
      </ul>

      <p>
        See the full breakdown of what&rsquo;s built and what&rsquo;s still open on the{" "}
        <a href="/docs/roadmap">RCP roadmap</a>.
      </p>

      <h2>Start with RCP</h2>
      <ul>
        <li>
          <a href="/docs/getting-started">Getting started — expose REST API to AI in 5 minutes with rcp-sdk</a>
        </li>
        <li>
          <a href="/docs/sdk/openai">Connect REST API to ChatGPT via OpenAI function calling adapter</a>
        </li>
        <li>
          <a href="/docs/sdk/langchain">REST API as LangChain DynamicStructuredTool + LangGraph</a>
        </li>
        <li>
          <a href="/docs/spec">Read the full RCP specification v0.1</a>
        </li>
        <li>
          <a href="/docs/examples">Working examples — Express + OpenAI</a>
        </li>
      </ul>
    </DocPage>
  );
}
