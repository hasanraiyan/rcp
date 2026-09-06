import type { Metadata } from "next";
import { DocPage } from "@/components/docs/doc-page";
import { CodeBlock, Callout } from "@/components/docs/code-block";

export const metadata: Metadata = {
  title: "OpenAI Adapter — Connect REST API to ChatGPT Function Calling",
  description:
    "rcp-sdk/adapters/openai: rcpToolsToOpenAiTools() converts RCP tools to OpenAI ChatCompletionTool format. Connect any REST API to ChatGPT / GPT-4o tool calling in one line.",
  keywords: [
    "OpenAI function calling REST API",
    "connect REST API to ChatGPT",
    "connect REST API to OpenAI",
    "rcpToolsToOpenAiTools",
    "OpenAI ChatCompletionTool",
    "GPT-4o tools REST API",
    "OpenAI adapter RCP",
  ],
  alternates: { canonical: "/docs/sdk/openai" },
};

export default function OpenAiSdkPage() {
  const techArticleJsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "OpenAI Adapter — Connect REST API to ChatGPT Function Calling",
    description:
      "Turn any REST API into OpenAI ChatGPT tools with rcp-sdk/adapters/openai. rcpToolsToOpenAiTools() converts RCP manifests to ChatCompletionTool[] for GPT-4o.",
    author: { "@type": "Person", name: "Raiyan Hasan", url: "https://hasanraiyan.me" },
    datePublished: "2026-09-06",
    dateModified: "2026-09-06",
    keywords: "OpenAI function calling, ChatGPT REST API, rcpToolsToOpenAiTools, ChatCompletionTool, GPT-4o tools",
    mainEntityOfPage: "https://rcp.hasanraiyan.me/docs/sdk/openai",
  };

  return (
    <DocPage
      title="OpenAI — rcp-sdk/adapters/openai"
      description="Convert RCP-discovered tools into OpenAI ChatCompletionTool format for ChatGPT / GPT-4o. Pass the result directly to openai.chat.completions.create() — no wrapper, no extra abstraction."
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticleJsonLd) }}
      />
      <CodeBlock
        lang="typescript"
        code={`import { rcpToolsToOpenAiTools, loadOpenAiTools } from 'rcp-sdk/adapters/openai';`}
      />
      <p>
        The OpenAI adapter converts <code>DiscoveredTool[]</code> from{" "}
        <code>rcp.discover()</code> into <code>ChatCompletionTool[]</code> — the format the OpenAI
        SDK expects. No wrapper around the SDK, just a format converter.
      </p>

      <h2>rcpToolsToOpenAiTools(tools, options?)</h2>
      <p>
        Converts an array of RCP tools into OpenAI function-calling format. Pass the result
        directly to <code>openai.chat.completions.create()</code>.
      </p>
      <CodeBlock
        lang="typescript"
        code={`import { createRcpClient } from 'rcp-sdk/client';
import { rcpToolsToOpenAiTools } from 'rcp-sdk/adapters/openai';
import OpenAI from 'openai';

const rcp = createRcpClient();
const { tools } = await rcp.discover('https://example.com/rcp/manifest');
const openaiTools = rcpToolsToOpenAiTools(tools);

const openai = new OpenAI();
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello' }],
  tools: openaiTools,
});`}
      />

      <h2>rcpToolToOpenAiTool(tool, options?)</h2>
      <p>
        Converts a single <code>DiscoveredTool</code> into OpenAI format. Useful when you want to
        cherry-pick tools from a discovered manifest.
      </p>
      <CodeBlock
        lang="typescript"
        code={`import { rcpToolToOpenAiTool } from 'rcp-sdk/adapters/openai';

const weatherTool = rcpToolToOpenAiTool(tools[0], {
  serverName: 'weather',
  prefixToolNameWithServerName: true,
});`}
      />

      <h2>loadOpenAiTools(manifestUrl, client, options?)</h2>
      <p>
        One-call helper: discovers the manifest and converts all tools in a single step.
      </p>
      <CodeBlock
        lang="typescript"
        code={`import { loadOpenAiTools } from 'rcp-sdk/adapters/openai';
import { createRcpClient } from 'rcp-sdk/client';

const rcp = createRcpClient();
const { tools, discovered } = await loadOpenAiTools(
  'https://example.com/rcp/manifest',
  rcp,
  { serverName: 'myApi' },
);`}
      />

      <h2>Options</h2>
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
              <code>serverName</code>
            </td>
            <td>
              <code>string</code>
            </td>
            <td>
              Prefix for tool names: <code>&quot;myApi__get_weather&quot;</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>prefixToolNameWithServerName</code>
            </td>
            <td>
              <code>boolean</code>
            </td>
            <td>
              If true and <code>serverName</code> is set, tool names become{" "}
              <code>serverName__toolName</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>additionalToolNamePrefix</code>
            </td>
            <td>
              <code>string</code>
            </td>
            <td>Extra prefix applied before server name.</td>
          </tr>
        </tbody>
      </table>
      </div>

      <h2>How it works</h2>
      <p>
        The adapter converts <code>exposedParams</code> into a JSON Schema{" "}
        <code>parameters</code> object matching OpenAI&apos;s function-calling format:
      </p>
      <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>RCP param type</th>
            <th>OpenAI type</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>string</code>
            </td>
            <td>
              <code>&quot;string&quot;</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>number</code>
            </td>
            <td>
              <code>&quot;number&quot;</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>boolean</code>
            </td>
            <td>
              <code>&quot;boolean&quot;</code>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
      <p>
        Parameters with <code>required: false</code> are omitted from the <code>required</code>{" "}
        array. The result is a standard <code>ChatCompletionTool</code> that you pass directly to{" "}
        <code>openai.chat.completions.create()</code>.
      </p>

      <Callout>
        The returned <code>OpenAiTool[]</code> is directly assignable to{" "}
        <code>ChatCompletionTool[]</code> — no casting needed. The adapter&apos;s parameter types
        extend <code>Record&lt;string, unknown&gt;</code> to match the OpenAI SDK&apos;s index
        signature requirement.
      </Callout>

      <h2>Related</h2>
      <ul>
        <li>
          <a href="/docs/getting-started">Getting started — expose REST API to AI in 5 minutes</a>
        </li>
        <li>
          <a href="/docs/sdk/langchain">LangChain adapter — REST API as DynamicStructuredTool</a>
        </li>
        <li>
          <a href="/docs/sdk/gemini">Gemini adapter — Google GenAI function calling</a>
        </li>
        <li>
          <a href="/docs/sdk/client">rcp-sdk/client — createRcpClient, discover() & call()</a>
        </li>
        <li>
          <a href="/docs/vs-mcp">RCP vs MCP comparison — lightweight MCP alternative</a>
        </li>
      </ul>
    </DocPage>
  );
}
