import type { Metadata } from "next";
import { DocPage } from "@/components/docs/doc-page";
import { CodeBlock, Callout } from "@/components/docs/code-block";

export const metadata: Metadata = {
  title: "rcp-sdk Client — createRcpClient, discover() & call() API",
  description:
    "rcp-sdk/client API: createRcpClient() with resolvers & auth, discover(manifestUrl) to fetch tools, call(tool, args) to execute REST endpoints as AI tools.",
  keywords: [
    "rcp-sdk client",
    "createRcpClient",
    "rcp discover",
    "rcp call",
    "rcp-sdk API reference",
    "connect REST API to AI client",
  ],
  alternates: { canonical: "/docs/sdk/client" },
};

export default function ClientSdkPage() {
  const techArticleJsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "rcp-sdk Client — createRcpClient, discover() & call()",
    description: "rcp-sdk/client API: createRcpClient with resolvers & auth, discover(manifestUrl), call(tool, args) to execute REST endpoints as AI tools.",
    author: { "@type": "Person", name: "Raiyan Hasan", url: "https://hasanraiyan.me" },
    datePublished: "2026-09-06",
    dateModified: "2026-09-06",
    keywords: "rcp-sdk client, createRcpClient, discover call, REST API AI client",
    mainEntityOfPage: "https://rcp.hasanraiyan.me/docs/sdk/client",
  };


  return (
    <DocPage
      title="Client — rcp-sdk/client"
      description="For whoever is building the AI application. Discovers a server's manifest, exposes its tools, and executes calls against them."
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticleJsonLd) }} />
      <CodeBlock lang="typescript" code={`import { createRcpClient } from 'rcp-sdk/client';`} />

      <h2>createRcpClient(options?)</h2>
      <p>
        Creates one client bound to a single server&rsquo;s auth/resolver/header configuration.
        Registering a second server means calling <code>createRcpClient()</code> again with
        different config — there&rsquo;s no multi-server registry inside one instance.
      </p>
      <CodeBlock
        lang="typescript"
        code={`const client = createRcpClient({
  auth: { type: 'header', secret: process.env.SERVER_TOKEN! },
  resolvers: {
    userId: (ctx) => ctx.currentUserId,
  },
  headers: {
    'X-Request-Id': () => crypto.randomUUID(),
  },
});`}
      />

      <Callout>
        Notice there&rsquo;s no URL in this config. <code>createRcpClient()</code> only sets up{" "}
        <em>how</em> to talk to a server — auth, resolvers, headers. <em>Which</em> server (its
        manifest URL) is passed separately to <code>discover()</code> below, and the tool objects it
        returns already carry their own URL for every subsequent <code>call()</code>. One client
        instance can discover any number of servers that share this auth/resolver/header setup.
      </Callout>

      <h3>Options</h3>
      <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Type</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>auth</code>
            </td>
            <td>
              <code>{"{type:'none'} | {type:'header',...} | {type:'oauth2'}"}</code>
            </td>
            <td>
              Defaults to <code>{"{ type: 'none' }"}</code>. <code>oauth2</code> throws immediately
              — use <code>none</code> or <code>header</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>resolvers</code>
            </td>
            <td>
              <code>Record&lt;string, (ctx) =&gt; unknown&gt;</code>
            </td>
            <td>
              Param name → resolver. Removed from <code>exposedParams</code> at discovery time,
              filled from the resolver at call time.
            </td>
          </tr>
          <tr>
            <td>
              <code>headers</code>
            </td>
            <td>
              <code>Record&lt;string, (ctx) =&gt; string&gt;</code>
            </td>
            <td>
              Attached to every outgoing request, independent of anything the manifest declares.
            </td>
          </tr>
          <tr>
            <td>
              <code>logger</code>
            </td>
            <td>
              <code>{"{ info, warn, error }"}</code>
            </td>
            <td>
              Silent by default. Pass <code>console</code>, or your own logger.
            </td>
          </tr>
        </tbody>
      </table>
      </div>

      <h2>client.discover(url, ctx?)</h2>
      <p>Fetches, validates, and returns a server&rsquo;s manifest.</p>
      <CodeBlock
        lang="typescript"
        code={`const { manifest, tools } = await client.discover('https://example.com/rcp/manifest');`}
      />
      <p>
        Returns <code>{"{ manifest, tools }"}</code>. Each discovered tool is the raw tool plus{" "}
        <code>exposedParams</code> — the same <code>params</code> array with every resolver-bound
        name removed.         Show <code>exposedParams</code>, not <code>params</code>, to your model.
      </p>
      <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Throws</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>Error</code>
            </td>
            <td>The manifest URL returned a non-2xx status.</td>
          </tr>
          <tr>
            <td>
              <code>RcpManifestValidationError</code>
            </td>
            <td>The response body doesn&rsquo;t match the manifest schema.</td>
          </tr>
          <tr>
            <td>
              <code>RcpVersionMismatchError</code>
            </td>
            <td>
              <code>rcpVersion</code> isn&rsquo;t one this client supports.
            </td>
          </tr>
        </tbody>
      </table>
      </div>

      <h2>client.call(tool, agentArgs?, ctx?)</h2>
      <p>
        Renders every token in the tool&rsquo;s <code>url</code>/<code>queryParams</code>/
        <code>headers</code>/<code>body</code>, resolving each from a registered resolver or from{" "}
        <code>agentArgs</code>, attaches auth and injected headers, makes the request, and applies{" "}
        <code>responseMappings</code>.
      </p>
      <CodeBlock
        lang="typescript"
        code={`const result = await client.call(tool, { city: 'Paris' }, { currentUserId: 'u_42' });
// { status: 200, ok: true, raw: {...}, mapped: {...} }`}
      />
      <p>
        Pass the raw tool object from <code>discover()</code>&rsquo;s <code>tools</code> array —{" "}
        <code>call()</code> needs the full <code>params</code> list to know which tokens are
        resolver-bound versus model-fillable.
      </p>
      <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Throws</th>
            <th>When</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>MissingTemplateValueError</code>
            </td>
            <td>
              A required, non-resolver-bound token has no value in <code>agentArgs</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>RcpResolverError</code>
            </td>
            <td>
              A registered resolver ran but returned <code>null</code>/<code>undefined</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>RcpToolAuthOverrideNotImplementedError</code>
            </td>
            <td>
              The tool declares its own auth, overriding the client&rsquo;s — not implemented yet.
            </td>
          </tr>
        </tbody>
      </table>
      </div>
      <Callout>
        None of these retry or swallow the problem — a call that can&rsquo;t be safely made throws
        before any HTTP request goes out.
      </Callout>

      <h2>Logging</h2>
      <p>
        Pass <code>logger: console</code> to see what the client is doing. Only structural facts are
        ever logged — tool names, HTTP methods, status codes, param names. Header values,
        request/response bodies, resolved values, and the auth secret are never logged.
      </p>
      <CodeBlock
        lang="typescript"
        code={`const client = createRcpClient({ logger: console });

await client.discover('https://example.com/rcp/manifest');
// info: [RCP] discover: GET https://example.com/rcp/manifest
// info: [RCP] discover: found 2 tool(s) at ... (auth: header): get_weather, search
// info: [RCP] discover: "get_weather" hides 1 resolver-bound param(s) from the model: city`}
      />

      <h2>Error classes</h2>
      <p>
        All exported from <code>rcp-sdk/client</code>, all plain <code>Error</code> subclasses (safe
        to <code>instanceof</code>-check): <code>RcpAuthNotImplementedError</code>,{" "}
        <code>RcpVersionMismatchError</code>, <code>RcpManifestValidationError</code>,{" "}
        <code>RcpResolverError</code>, <code>RcpToolAuthOverrideNotImplementedError</code>,{" "}
        <code>MissingTemplateValueError</code>.
      </p>

      <h2>Related</h2>
      <ul>
        <li>
          <a href="/docs/sdk/server">rcp-sdk/server — defineTool() to expose REST endpoint as AI tool</a>
        </li>
        <li>
          <a href="/docs/sdk/openai">OpenAI adapter — connect REST API to ChatGPT</a>
        </li>
        <li>
          <a href="/docs/sdk/langchain">LangChain adapter — DynamicStructuredTool</a>
        </li>
        <li>
          <a href="/docs/concepts/resolvers">Resolvers — hide tenant ID from LLM</a> and <a href="/docs/concepts/auth">Auth — secure REST API for AI</a>
        </li>
      </ul>
    </DocPage>
  );
}
