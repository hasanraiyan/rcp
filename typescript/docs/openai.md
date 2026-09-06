# `rcp-sdk/adapters/openai`

Converts RCP-discovered tools into OpenAI function-calling format (`ChatCompletionTool`). Pass the
result directly to the OpenAI SDK — no wrapper, no extra abstraction.

```ts
import { rcpToolsToOpenAiTools, loadOpenAiTools } from "rcp-sdk/adapters/openai";
```

## `rcpToolsToOpenAiTools(tools, options?)`

Converts an array of `DiscoveredTool` instances into OpenAI `ChatCompletionTool` format.

```ts
import { createRcpClient } from "rcp-sdk/client";
import { rcpToolsToOpenAiTools } from "rcp-sdk/adapters/openai";
import OpenAI from "openai";

const rcp = createRcpClient();
const { tools } = await rcp.discover("https://example.com/rcp/manifest");
const openaiTools = rcpToolsToOpenAiTools(tools);

const openai = new OpenAI();
const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello" }],
  tools: openaiTools,
});
```

## `rcpToolToOpenAiTool(tool, options?)`

Converts a single `DiscoveredTool` into OpenAI format. Useful when you want to cherry-pick tools.

```ts
import { rcpToolToOpenAiTool } from "rcp-sdk/adapters/openai";

const weatherTool = rcpToolToOpenAiTool(tools[0], {
  serverName: "weather",
  prefixToolNameWithServerName: true,
});
```

## `loadOpenAiTools(manifestUrl, client, options?)`

One-call helper: discovers the manifest and converts all tools.

```ts
import { loadOpenAiTools } from "rcp-sdk/adapters/openai";
import { createRcpClient } from "rcp-sdk/client";

const rcp = createRcpClient();
const { tools, discovered } = await loadOpenAiTools("https://example.com/rcp/manifest", rcp, {
  serverName: "myApi",
});
```

## Options

| Option                         | Type      | Notes                                                                      |
| ------------------------------ | --------- | -------------------------------------------------------------------------- |
| `serverName`                   | `string`  | Prefix for tool names: `"myApi__get_weather"`.                             |
| `prefixToolNameWithServerName` | `boolean` | If true and `serverName` is set, tool names become `serverName__toolName`. |
| `additionalToolNamePrefix`     | `string`  | Extra prefix applied before server name.                                   |

## How it works

The adapter converts `exposedParams` into a JSON Schema `parameters` object matching OpenAI's
function-calling format:

| RCP param type | OpenAI `type` |
| -------------- | ------------- |
| `string`       | `"string"`    |
| `number`       | `"number"`    |
| `boolean`      | `"boolean"`   |

Parameters with `required: false` are omitted from the `required` array. The result is a standard
`ChatCompletionTool` that you pass directly to `openai.chat.completions.create()`.
