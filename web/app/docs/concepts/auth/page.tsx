import type { Metadata } from "next";
import { DocPage } from "@/components/docs/doc-page";
import { CodeBlock, Callout } from "@/components/docs/code-block";

export const metadata: Metadata = {
  title: "Auth",
  description:
    "RCP's three auth modes — none, header, and oauth2 — and how client-injected headers work alongside them.",
  alternates: { canonical: "/docs/concepts/auth" },
};

export default function AuthPage() {
  return (
    <DocPage
      title="Auth"
      description="One declaration at the top level of the manifest secures both the manifest fetch and every tool call by default."
    >
      <p>
        A tool may set its own <code>auth</code> to override the server-level default — needed when
        a tool&rsquo;s <code>url</code> points at a different domain than the manifest — but the
        common case declares it once. Three modes, the same tiers MCP itself supports.
      </p>

      <h2>
        <code>{'{ "type": "none" }'}</code>
      </h2>
      <p>No auth. The manifest is fetched with a plain GET; tool calls carry no injected header.</p>

      <h2>
        <code>{'{ "type": "header", "header": "Authorization", "scheme": "Bearer" }'}</code>
      </h2>
      <p>
        A static shared secret, attached as <code>{"<header>: <scheme> <secret>"}</code> (or just{" "}
        <code>{"<header>: <secret>"}</code> if <code>scheme</code> is omitted). The manifest never
        contains the secret itself — only its shape. The literal value is something the client
        operator configures when they register the server.
      </p>
      <CodeBlock
        lang="typescript"
        code={`const client = createRcpClient({
  auth: { type: 'header', secret: process.env.SERVER_TOKEN! },
});`}
      />

      <h2>
        <code>{'{ "type": "oauth2", "resource": "https://api.example.com" }'}</code>
      </h2>
      <p>
        Full OAuth 2.1, specified as the same RFC set MCP&rsquo;s own authorization spec uses:
        Protected Resource Metadata (RFC 9728), Authorization Server metadata (RFC 8414), Dynamic
        Client Registration (RFC 7591), PKCE (RFC 7636), and Resource Indicators (RFC 8707) so a
        token is scoped to this server specifically.
      </p>
      <Callout tone="warn">
        Specified fully in the protocol so the wire format never has to change to add it, but{" "}
        <code>oauth2</code> is not implemented by the reference client yet — it throws immediately
        at <code>createRcpClient()</code>. Use <code>&apos;none&apos;</code> or{" "}
        <code>&apos;header&apos;</code> for now.
      </Callout>

      <h2>Client-injected headers</h2>
      <p>
        Separate from auth and resolvers, a client can attach headers to any outgoing request that
        don&rsquo;t correspond to any declared param at all — a correlation id, a protocol-version
        echo, anything the client&rsquo;s own tracing needs.
      </p>
      <CodeBlock
        lang="typescript"
        code={`const client = createRcpClient({
  headers: {
    'X-Request-Id': () => crypto.randomUUID(),
    'X-RCP-Version': () => '0.1',
  },
});`}
      />
      <p>
        A server <strong>must</strong> ignore headers it doesn&rsquo;t recognize rather than
        rejecting the request — a client is always free to add more later without that being a
        breaking change.
      </p>
    </DocPage>
  );
}
