import type { Metadata } from "next";
import { DocPage } from "@/components/docs/doc-page";
import { CodeBlock } from "@/components/docs/code-block";

export const metadata: Metadata = {
  title: "Introduction — What is RCP? REST Connector Protocol Explained",
  description:
    "What is RCP? A lightweight, stateless alternative to MCP for exposing your existing REST API as AI-callable tools — no protocol server, just a JSON manifest + plain HTTP.",
  keywords: [
    "what is RCP",
    "REST Connector Protocol explained",
    "RCP protocol overview",
    "expose REST API to AI",
    "lightweight MCP alternative",
    "stateless AI protocol",
    "REST API to AI tools",
  ],
  alternates: { canonical: "/docs" },
};

export default function DocsIntroPage() {
  return (
    <DocPage
      title="Introduction"
      description="RCP (REST Connector Protocol) is a lightweight, open protocol for exposing REST APIs as AI-callable tools — without running a protocol server."
    >
      <p>
        If MCP is the right fit when you need rich, stateful capabilities, RCP is for the much more
        common case: you already have a REST API, and you just want an AI application to be able to
        call some of its endpoints as tools.
      </p>

      <h2>The shape of it</h2>
      <p>
        A <strong>server</strong> publishes a plain JSON manifest at a URL. A{" "}
        <strong>client</strong> fetches it, builds callable tools from it, and calls the endpoints
        it describes directly — no JSON-RPC, no persistent connection.
      </p>

      <CodeBlock
        lang="text"
        code={`Client                             Server
------                             ------
GET  <manifest-url>          -->  200 { "rcpVersion": "0.1", "tools": [...] }
...model picks a tool...
<method> <tool's own url>    -->  (whatever that endpoint normally returns)`}
      />

      <p>That&rsquo;s the entire wire protocol. There is no other message type.</p>

      <h2>Two roles, nothing else</h2>
      <p>
        RCP has exactly two roles — no third &ldquo;host&rdquo; layer, no persistent per-server
        connection to hold open.
      </p>
      <ul>
        <li>
          <strong>Client</strong> — the AI application. Registers servers (URL + how to
          authenticate), fetches their manifests, presents the tools they describe to a model,
          executes the ones the model calls.
        </li>
        <li>
          <strong>Server</strong> — anything that answers <code>GET &lt;manifest-url&gt;</code> with
          a conformant manifest. A static JSON file behind a CDN is a valid, fully conformant RCP
          server.
        </li>
      </ul>

      <h2>Design principles</h2>
      <ul>
        <li>
          <strong>Zero protocol library on the server side.</strong> A conformant server can be{" "}
          <code>curl</code>-tested — no handshake, no persistent socket.
        </li>
        <li>
          <strong>Discovery and execution hit different places.</strong> The manifest is a
          directory, not a proxy — a tool call goes straight to the tool&rsquo;s own URL, which can
          be an entirely different host.
        </li>
        <li>
          <strong>The client is the trust boundary.</strong> A server&rsquo;s manifest is untrusted
          input until the client&rsquo;s operator has explicitly registered that server.
        </li>
        <li>
          <strong>Secrets never appear in the manifest</strong>, and never reach the model.
        </li>
        <li>
          <strong>No persistence requirement.</strong> A client may treat a manifest as fully
          ephemeral, or cache it with a TTL — nothing in the protocol depends on either choice.
        </li>
      </ul>

      <p>
        Want the full picture of what&rsquo;s built versus still open? See the{" "}
        <a href="/docs/roadmap">roadmap</a>. Ready to see RCP end to end? Continue to{" "}
        <a href="/docs/getting-started">Getting started — expose your REST API to AI in 5 minutes</a>.
      </p>

      <h2>Explore RCP</h2>
      <ul>
        <li>
          <a href="/docs/vs-mcp">RCP vs MCP — lightweight alternative to Model Context Protocol</a> — when to use stateless HTTP vs a dedicated MCP server
        </li>
        <li>
          <a href="/docs/concepts/manifest">The manifest — JSON directory of AI tools</a> — how <code>GET /manifest</code> turns REST endpoints into AI-callable tools
        </li>
        <li>
          <a href="/docs/concepts/resolvers">Resolvers — hide tenant ID & user ID from the LLM</a> — resolver-bound params for secure multi-tenant isolation
        </li>
        <li>
          <a href="/docs/sdk/openai">Build AI agent with OpenAI SDK — REST API as tools</a> — <code>rcpToolsToOpenAiTools()</code> adapter
        </li>
        <li>
          <a href="/docs/sdk/langchain">Build AI agent with LangChain — REST API as DynamicStructuredTool</a> — LangChain & LangGraph adapter with MultiServerRcpClient
        </li>
        <li>
          <a href="/docs/spec">Full RCP specification v0.1</a> — architecture, security & trust model
        </li>
      </ul>
    </DocPage>
  );
}
