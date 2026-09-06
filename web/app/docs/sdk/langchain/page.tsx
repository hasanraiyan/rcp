import type { Metadata } from "next";
import { DocPage } from "@/components/docs/doc-page";
import { CodeBlock, Callout } from "@/components/docs/code-block";

export const metadata: Metadata = {
  title: "LangChain — rcp-sdk/adapters/langchain",
  description:
    "API reference for the LangChain adapter: convert RCP-discovered tools into LangChain DynamicStructuredTool instances.",
};

export default function LangChainSdkPage() {
  return (
    <DocPage
      title="LangChain — rcp-sdk/adapters/langchain"
      description="Convert RCP-discovered tools into LangChain DynamicStructuredTool instances. Handles schema conversion, response mapping, and resolver-bound context injection automatically."
    >
      <CodeBlock
        lang="typescript"
        code={`import { rcpToolsToLangChainTools, loadRcpLangChainTools } from 'rcp-sdk/adapters/langchain';`}
      />
      <p>
        The LangChain adapter bridges RCP and LangChain/LangGraph. It takes{" "}
        <code>DiscoveredTool[]</code> from <code>rcp.discover()</code> and produces LangChain{" "}
        <code>DynamicStructuredTool</code> instances that work with any LangChain agent or chain.
      </p>

      <Callout>
        <code>@langchain/core</code> is an optional peer dependency. The adapter only needs to be
        installed if you import from <code>rcp-sdk/adapters/langchain</code>.
      </Callout>

      <h2>loadRcpLangChainTools(manifestUrl, client, options?)</h2>
      <p>
        One-call helper: discovers the manifest and converts all tools in a single step.
      </p>
      <CodeBlock
        lang="typescript"
        code={`import { createRcpClient } from 'rcp-sdk/client';
import { loadRcpLangChainTools } from 'rcp-sdk/adapters/langchain';
import { ChatOpenAI } from '@langchain/openai';
import { createAgent } from 'langchain';

const rcp = createRcpClient();
const tools = await loadRcpLangChainTools(
  'https://example.com/rcp/manifest',
  rcp,
  {
    context: { userId: 'u_1' },     // resolver-bound values, hidden from model
    serverName: 'myApi',            // prefixes tool names: myApi__tool_name
  },
);

const model = new ChatOpenAI({ model: 'gpt-4o-mini' });
const agent = createAgent({ model, tools });`}
      />

      <h3>Options</h3>
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
              <code>context</code>
            </td>
            <td>
              <code>Record&lt;string, unknown&gt; | (() =&gt; Record&lt;string, unknown&gt;)</code>
            </td>
            <td>
              Static value or zero-arg function. Passed to <code>rcp.call()</code> as the context for
              resolvers. Values never reach the model.
            </td>
          </tr>
          <tr>
            <td>
              <code>serverName</code>
            </td>
            <td>
              <code>string</code>
            </td>
            <td>
              Prefix for tool names: <code>"myApi__get_weather"</code>. Useful when combining tools
              from multiple servers.
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
              Alias for <code>serverName</code> when you just want the prefix without a custom name.
            </td>
          </tr>
        </tbody>
      </table>

      <h2>rcpToolsToLangChainTools(tools, client, options?)</h2>
      <p>
        Converts an array of <code>DiscoveredTool</code> instances into LangChain{" "}
        <code>DynamicStructuredTool</code> instances. Use this when you need more control over the
        discovery step.
      </p>
      <CodeBlock
        lang="typescript"
        code={`import { createRcpClient } from 'rcp-sdk/client';
import { rcpToolsToLangChainTools } from 'rcp-sdk/adapters/langchain';

const rcp = createRcpClient();
const { tools } = await rcp.discover('https://example.com/rcp/manifest');
const langchainTools = rcpToolsToLangChainTools(tools, rcp);`}
      />

      <h2>rcpToolToLangChainTool(tool, client, options?)</h2>
      <p>
        Converts a single <code>DiscoveredTool</code> into a LangChain{" "}
        <code>DynamicStructuredTool</code>. Useful when you want to cherry-pick tools.
      </p>

      <h2>MultiServerRcpClient</h2>
      <p>
        Manages multiple RCP servers, caching discovery per server. Useful when your agent pulls
        tools from several manifests.
      </p>
      <CodeBlock
        lang="typescript"
        code={`import { MultiServerRcpClient } from 'rcp-sdk/adapters/langchain';

const multi = new MultiServerRcpClient({
  servers: {
    weather: {
      manifestUrl: 'https://weather.example.com/rcp/manifest',
      client: createRcpClient(),
    },
    users: {
      manifestUrl: 'https://users.example.com/rcp/manifest',
      client: createRcpClient(),
    },
  },
});

// Get all tools from all servers
const tools = await multi.getTools();

// Or get tools from a specific server
const weatherTools = await multi.getToolsForServer('weather');

// Force re-discovery
multi.invalidateCache('weather');`}
      />

      <h3>Constructor options</h3>
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
              <code>servers</code>
            </td>
            <td>
              <code>{"Record<string, { manifestUrl: string; client: RcpClient }>"}</code>
            </td>
            <td>Required. Map of server name to config.</td>
          </tr>
          <tr>
            <td>
              <code>context</code>
            </td>
            <td>
              <code>Record&lt;string, unknown&gt; | (() =&gt; Record&lt;string, unknown&gt;)</code>
            </td>
            <td>Default context for all servers.</td>
          </tr>
          <tr>
            <td>
              <code>getContextForServer</code>
            </td>
            <td>
              <code>Record&lt;string, Record&lt;string, unknown&gt;&gt;</code>
            </td>
            <td>Per-server context overrides.</td>
          </tr>
          <tr>
            <td>
              <code>serverName</code>
            </td>
            <td>
              <code>string</code>
            </td>
            <td>Default prefix for all tool names.</td>
          </tr>
          <tr>
            <td>
              <code>additionalToolNamePrefix</code>
            </td>
            <td>
              <code>string</code>
            </td>
            <td>Extra prefix applied after server name.</td>
          </tr>
          <tr>
            <td>
              <code>throwOnLoadError</code>
            </td>
            <td>
              <code>boolean</code>
            </td>
            <td>
              If <code>true</code> (default), throws if any server fails to load. If{" "}
              <code>false</code>, skips failed servers.
            </td>
          </tr>
        </tbody>
      </table>

      <h2>How it works</h2>
      <p>The adapter does three things for each tool:</p>
      <ol>
        <li>
          <strong>Schema:</strong> Converts <code>exposedParams</code> into a Zod object schema — what
          LangChain&apos;s <code>DynamicStructuredTool</code> expects.
        </li>
        <li>
          <strong>Execution:</strong> Each tool call delegates to <code>rcpClient.call(tool, args, ctx)</code>,
          which renders the URL, attaches auth, and makes the real HTTP request.
        </li>
        <li>
          <strong>Response:</strong> <code>responseMappings</code> are applied automatically — the model
          gets a clean object, not raw JSON paths.
        </li>
      </ol>
    </DocPage>
  );
}
