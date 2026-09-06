# `rcp-sdk/adapters/langchain`

Converts RCP-discovered tools into LangChain `DynamicStructuredTool` instances. Handles schema
conversion, response mapping, and resolver-bound context injection automatically.

```ts
import { rcpToolsToLangChainTools, loadRcpLangChainTools } from "rcp-sdk/adapters/langchain";
```

## `loadRcpLangChainTools(manifestUrl, client, options?)`

One-call helper: discovers the manifest and converts all tools in a single step.

```ts
import { createRcpClient } from "rcp-sdk/client";
import { loadRcpLangChainTools } from "rcp-sdk/adapters/langchain";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent } from "langchain";

const rcp = createRcpClient();
const tools = await loadRcpLangChainTools("https://example.com/rcp/manifest", rcp, {
  context: { userId: "u_1" }, // resolver-bound values, hidden from model
  serverName: "myApi", // prefixes tool names: myApi__tool_name
});

const model = new ChatOpenAI({ model: "gpt-4o-mini" });
const agent = createAgent({ model, tools });
```

### Options

| Option                         | Type                                                         | Notes                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `context`                      | `Record<string, unknown> \| (() => Record<string, unknown>)` | Static value or zero-arg function. Passed to `rcp.call()` as the context for resolvers. Values never reach the model. |
| `serverName`                   | `string`                                                     | Prefix for tool names: `"myApi__get_weather"`. Useful when combining tools from multiple servers.                     |
| `prefixToolNameWithServerName` | `boolean`                                                    | Alias for `serverName` when you just want the prefix without a custom name.                                           |

## `rcpToolsToLangChainTools(tools, client, options?)`

Converts an array of `DiscoveredTool` instances into LangChain `DynamicStructuredTool` instances.
Use this when you need more control over the discovery step.

```ts
import { createRcpClient } from "rcp-sdk/client";
import { rcpToolsToLangChainTools } from "rcp-sdk/adapters/langchain";

const rcp = createRcpClient();
const { tools } = await rcp.discover("https://example.com/rcp/manifest");
const langchainTools = rcpToolsToLangChainTools(tools, rcp);
```

## `rcpToolToLangChainTool(tool, client, options?)`

Converts a single `DiscoveredTool` into a LangChain `DynamicStructuredTool`. Useful when you want
to cherry-pick tools from a discovered manifest.

```ts
import { rcpToolToLangChainTool } from "rcp-sdk/adapters/langchain";

const weatherTool = rcpToolToLangChainTool(tools[0], rcp, {
  context: { userId: "u_1" },
  serverName: "weather",
});
```

## `MultiServerRcpClient`

Manages multiple RCP servers, caching discovery per server. Useful when your agent pulls tools
from several manifests.

```ts
import { MultiServerRcpClient } from "rcp-sdk/adapters/langchain";
import { createRcpClient } from "rcp-sdk/client";

const multi = new MultiServerRcpClient({
  servers: {
    weather: {
      manifestUrl: "https://weather.example.com/rcp/manifest",
      client: createRcpClient(),
    },
    users: {
      manifestUrl: "https://users.example.com/rcp/manifest",
      client: createRcpClient(),
    },
  },
});

// Get all tools from all servers
const tools = await multi.getTools();

// Or get tools from a specific server
const weatherTools = await multi.getToolsForServer("weather");

// Force re-discovery
multi.invalidateCache("weather");
```

### Constructor options

| Option                     | Type                                                         | Notes                                                                                      |
| -------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `servers`                  | `Record<string, { manifestUrl: string; client: RcpClient }>` | Required. Map of server name to config.                                                    |
| `context`                  | `Record<string, unknown> \| (() => Record<string, unknown>)` | Default context for all servers.                                                           |
| `getContextForServer`      | `Record<string, Record<string, unknown>>`                    | Per-server context overrides.                                                              |
| `serverName`               | `string`                                                     | Default prefix for all tool names.                                                         |
| `additionalToolNamePrefix` | `string`                                                     | Extra prefix applied after server name.                                                    |
| `throwOnLoadError`         | `boolean`                                                    | If `true` (default), throws if any server fails to load. If `false`, skips failed servers. |

## How it works

The adapter does three things for each tool:

1. **Schema:** Converts `exposedParams` into a Zod object schema — what LangChain's
   `DynamicStructuredTool` expects.
2. **Execution:** Each tool call delegates to `rcpClient.call(tool, args, ctx)`, which renders the
   URL, attaches auth, and makes the real HTTP request.
3. **Response:** `responseMappings` are applied automatically — the model gets a clean object, not
   raw JSON paths.

## Peer dependency

`@langchain/core >= 0.3.0` is an optional peer dependency. The adapter only needs to be installed
if you import from `rcp-sdk/adapters/langchain`.
