import type { Metadata } from "next";
import { DocPage } from "@/components/docs/doc-page";
import { CodeBlock, Callout } from "@/components/docs/code-block";

export const metadata: Metadata = {
  title: "Full spec",
  description:
    "The complete RCP v0.1 specification — architecture, the manifest, resolvers, auth, security & trust, what's out of scope, and open questions.",
};

export default function SpecPage() {
  return (
    <DocPage
      title="Full spec"
      description="RCP v0.1 — draft. Not finalized, not yet implemented in full. This is the starting point for discussion, not a committed spec."
    >
      <Callout>
        The spec documents all three <code>auth</code> modes, but the first implementation only
        needs to actually build <code>none</code> and <code>header</code> — those cover the common
        cases. <code>oauth2</code> stays fully specified so the wire format never has to change to
        add it, but building it is deliberately deferred past v1.
      </Callout>

      <h2>The one-line pitch</h2>
      <p>
        MCP for the case where you already just have a REST API and don&rsquo;t want to run a
        protocol server to expose it — a server publishes a plain JSON manifest at a URL; any
        client fetches it, builds tools from it, and calls the endpoints it describes directly. No
        JSON-RPC, no persistent connection, no SDK required on the server side at all (a server can
        be a single static JSON file).
      </p>

      <h2>Why not just use MCP</h2>
      <p>
        MCP is the right answer when you want rich, stateful capabilities — resources a user
        browses, prompts a user picks, elicitation/sampling mid-call, a long-lived connection. That
        power has a cost: implementing an MCP server means implementing JSON-RPC, a transport
        (stdio or Streamable HTTP), and the base protocol&rsquo;s negotiation flow, even if all you
        actually have is &ldquo;call this REST endpoint with this shape.&rdquo;
      </p>
      <p>
        RCP is deliberately <em>not</em> trying to be MCP-but-open-source. See{" "}
        <a href="/docs/vs-mcp">RCP vs MCP</a> for the full comparison and a concrete checklist for
        which one fits your case.
      </p>

      <h2>Design principles</h2>
      <ul>
        <li>
          <strong>Zero protocol library on the server side.</strong> A conformant server can be{" "}
          <code>curl</code>-tested — there&rsquo;s no handshake, no persistent socket, no client
          library required to implement one. A static JSON file behind a CDN is a valid, fully
          conformant RCP server.
        </li>
        <li>
          <strong>Discovery and execution are different requests to different places.</strong>{" "}
          Fetching the manifest only ever tells the client what exists. Running a tool means the
          client makes an ordinary HTTP request straight to that tool&rsquo;s own declared URL —
          which can be a completely different domain than the manifest itself. The manifest
          endpoint is a directory, not a proxy.
        </li>
        <li>
          <strong>The client is the trust boundary</strong>, same principle MCP states explicitly.
          A server&rsquo;s manifest is untrusted input until the client&rsquo;s operator has
          explicitly registered that server.
        </li>
        <li>
          <strong>Secrets never appear in the manifest</strong>, and never reach the model. A tool
          declares that it needs auth and how, but the actual secret value lives only in the
          client&rsquo;s own secret store, resolved at execution time.
        </li>
        <li>
          <strong>No persistence requirement on the client either.</strong> A client is allowed to
          treat a fetched manifest as fully ephemeral — re-fetch it on every use. Clients may cache
          with a TTL for performance; nothing in the protocol depends on them doing so.
        </li>
      </ul>

      <h2>Architecture</h2>
      <p>
        RCP has exactly two roles — <strong>Client</strong> and <strong>Server</strong> — not the
        three-way Host/Client/Server split MCP uses, because there&rsquo;s no persistent per-server
        connection to hold open; a client talks to as many servers as it wants, each interaction a
        plain stateless request.
      </p>
      <ul>
        <li>
          <strong>Client</strong> — the AI application. Registers servers (URL + how to
          authenticate to it), fetches their manifests, presents the tools they describe to a
          model, executes the ones the model calls.
        </li>
        <li>
          <strong>Server</strong> — anything that answers <code>GET &lt;manifest-url&gt;</code>{" "}
          with a conformant manifest document. Has no obligation beyond that one endpoint; the tool
          endpoints the manifest describes can be the same server or entirely separate ones.
        </li>
      </ul>
      <CodeBlock
        lang="text"
        code={`Client                             Server
------                             ------
GET  <manifest-url>          -->  200 { "rcpVersion": "0.1", "tools": [...] }
(builds callable tools from the manifest)
...model picks a tool...
<method> <tool's own url>    -->  (whatever that endpoint normally returns)`}
      />
      <p>That&rsquo;s the entire wire protocol. There is no other message type.</p>

      <h2>The manifest</h2>
      <p>
        <code>GET &lt;manifest-url&gt;</code> returns a JSON document with <code>rcpVersion</code>,{" "}
        <code>auth</code>, and a <code>tools</code> array. Full field-by-field reference at{" "}
        <a href="/docs/concepts/manifest">The manifest</a>.
      </p>
      <CodeBlock
        lang="json"
        code={`{
  "rcpVersion": "0.1",
  "auth": { "type": "none" },
  "tools": [
    {
      "name": "get_learner_profile",
      "description": "Fetches a learner's plan and progress by id.",
      "method": "GET",
      "url": "https://api.example.com/learners/{{learnerId}}/profile",
      "params": [
        { "name": "learnerId", "type": "string", "description": "The learner's id" }
      ],
      "responseMappings": { "name": "@data.name", "progress": "@data.progress.percent" }
    }
  ]
}`}
      />

      <h2>Resolvers — a client-side capability, not a wire concept</h2>
      <p>
        A tool often needs a value that shouldn&rsquo;t come from the model at all — which end-user
        is asking, which tenant they belong to, a locale. MCP has no answer for this;{" "}
        <code>inputSchema</code> is plain JSON Schema, every property is something the client is
        expected to let the model fill. RCP&rsquo;s answer is to keep the wire format untouched and
        put the mechanism entirely on the client side instead. Full detail at{" "}
        <a href="/docs/concepts/resolvers">Resolvers</a>.
      </p>

      <h2>Auth</h2>
      <p>
        One declaration at the top level of the manifest secures both the manifest fetch and every
        tool call by default. Three modes, deliberately the same tiers MCP itself supports:{" "}
        <code>none</code>, <code>header</code> (a static shared secret), and <code>oauth2</code>{" "}
        (the same RFC stack as MCP&rsquo;s own authorization spec). Full detail at{" "}
        <a href="/docs/concepts/auth">Auth</a>.
      </p>

      <h2>Client-injected headers — beyond resolvers</h2>
      <p>
        Separate from resolvers, a client is free to attach headers to any outgoing request that
        don&rsquo;t correspond to any declared param at all — a correlation id, a protocol-version
        echo, whatever the chosen auth mode requires. A server <strong>must</strong> ignore headers
        it doesn&rsquo;t recognize rather than rejecting the request.
      </p>

      <h2>Reference SDK — what it provides</h2>
      <p>
        Everything above is a set of behaviors a conformant client must implement — nothing
        requires a shared library to exist. But without one, every client ends up hand-rolling the
        same discovery-fetch-template-inject logic. See{" "}
        <a href="/docs/sdk/client">Client — rcp-sdk/client</a> and{" "}
        <a href="/docs/sdk/server">Server — rcp-sdk/server</a> for the full reference.
      </p>
      <CodeBlock
        lang="typescript"
        code={`const rcpClient = createRcpClient({
  auth: { type: 'header', header: 'Authorization', scheme: 'Bearer', secret: /* client-held value */ },

  resolvers: {
    learnerId: (ctx) => ctx.currentUserId,
  },

  headers: {
    'X-Client-User-Id': (ctx) => ctx.currentUserId,
    'X-RCP-Version': () => '0.1',
  },
});

const tools = await rcpClient.discover(serverUrl);
const result = await rcpClient.call(tool, agentArgs, ctx);`}
      />

      <h2>Fitting into an agent framework</h2>
      <p>
        Most agent frameworks reduce to: a flat list of callable tools handed to the model. RCP
        only needs to plug into that half — a client resolves a manifest&rsquo;s tools into
        whatever tool representation its framework expects and adds them to that same flat list. A
        framework doesn&rsquo;t need to know or care that a given tool came from an RCP server
        rather than a hand-built one. RCP v0.1 deliberately has no equivalent of a
        &ldquo;skills&rdquo;/instructions concept — the same posture MCP itself takes toward its own
        optional Skills extension.
      </p>

      <h2>Versioning</h2>
      <p>
        <code>rcpVersion</code> is a plain string on every manifest response. A client that
        receives a manifest with a <code>rcpVersion</code> it doesn&rsquo;t understand should
        refuse to load that server&rsquo;s tools rather than guess — same explicit-over-implicit
        posture as MCP&rsquo;s capability negotiation.
      </p>

      <h2>Security & trust</h2>
      <p>Adapted from MCP&rsquo;s stated principles:</p>
      <ul>
        <li>
          <strong>Registration is consent.</strong> A client must not fetch or execute anything
          from a server the client&rsquo;s operator didn&rsquo;t explicitly register — no automatic
          discovery of arbitrary URLs.
        </li>
        <li>
          <strong>Tool descriptions are untrusted content</strong> from an unverified server — a
          client UI that lets an operator review a manifest before attaching it to a live agent is
          the mitigation, not a protocol-level guarantee.
        </li>
        <li>
          <strong>Secrets are client-side only.</strong> A manifest declares only the shape of auth
          required, never a credential.
        </li>
        <li>
          <strong>A server can&rsquo;t see client-side conversation state.</strong> Nothing about
          the surrounding conversation is ever sent to a server beyond what a specific tool
          call&rsquo;s own params/body explicitly carry.
        </li>
      </ul>

      <h2>What&rsquo;s explicitly out of scope for v0.1</h2>
      <ul>
        <li>
          Resources, Prompts, Sampling, Elicitation, Roots — all MCP concepts with no RCP
          equivalent yet. If real demand shows up, they&rsquo;d be additive, opt-in extensions
          layered on the same manifest+HTTP model, not a rewrite of it.
        </li>
        <li>
          A bidirectional/streaming transport. Every RCP interaction is a plain request/response
          over HTTPS; there is no long-lived connection, no server-push.
        </li>
        <li>
          A server-side SDK requirement. The spec is fully defined by &ldquo;does{" "}
          <code>GET &lt;manifest-url&gt;</code> return valid JSON matching the schema.&rdquo;
        </li>
      </ul>

      <h2>Open questions for discussion</h2>
      <ul>
        <li>
          Should <code>rcpVersion</code> be part of the manifest body (as drafted) or an HTTP
          header, so a client can reject an incompatible version without parsing the body at all?
        </li>
        <li>
          Should a call to a tool with an unresolvable registered resolver fail the whole turn, or
          just make that one tool silently unavailable for turns with no verified caller?
        </li>
        <li>
          Should the spec recommend (not require) a naming convention for commonly-resolved
          params — e.g. servers document their identity param as <code>identity</code> or{" "}
          <code>userId</code> by convention?
        </li>
        <li>
          Does a server ever need to push a manifest-changed notification, or is &ldquo;clients may
          re-fetch whenever they want&rdquo; sufficient forever?
        </li>
        <li>
          Reference SDK languages/priority — presumably TypeScript first, but is a second language
          worth it for &ldquo;open protocol&rdquo; credibility?
        </li>
      </ul>

      <p>
        See <a href="/docs/roadmap">the roadmap</a> for what&rsquo;s actually built versus still
        open.
      </p>
    </DocPage>
  );
}
