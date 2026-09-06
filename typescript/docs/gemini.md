# `rcp-sdk/adapters/gemini`

Converts RCP-discovered tools into Google GenAI (Gemini) function-calling format. Supports both
the Interactions API and the classic `generateContent` API.

```ts
import {
  rcpToolsToGeminiInteractionsTools,
  rcpToolsToGeminiClassicTools,
  loadGeminiTools,
} from "rcp-sdk/adapters/gemini";
```

## Interactions API

The simpler format — flat tool entries passed to `ai.interactions.create()`.

```ts
import { createRcpClient } from "rcp-sdk/client";
import { rcpToolsToGeminiInteractionsTools } from "rcp-sdk/adapters/gemini";
import { GoogleGenAI } from "@google/genai";

const rcp = createRcpClient();
const { tools } = await rcp.discover("https://example.com/rcp/manifest");
const geminiTools = rcpToolsToGeminiInteractionsTools(tools);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const interaction = await ai.interactions.create({
  model: "models/gemini-2.5-flash",
  input: prompt,
  tools: geminiTools,
});
```

## Classic `generateContent`

The wrapped format — `functionDeclarations` inside a `tools` array entry.

```ts
import { rcpToolsToGeminiClassicTools } from "rcp-sdk/adapters/gemini";

const classicTools = rcpToolsToGeminiClassicTools(tools);

const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: prompt,
  config: { tools: classicTools },
});
```

## `rcpToolToGeminiInteractionsTool(tool, options?)`

Converts a single `DiscoveredTool` into Gemini Interactions API format.

## `rcpToolToGeminiFunctionDeclaration(tool, options?)`

Converts a single `DiscoveredTool` into a `FunctionDeclaration` for the classic API.

## `loadGeminiTools(manifestUrl, client, options?)`

One-call helper: discovers the manifest and returns both formats.

```ts
import { loadGeminiTools } from "rcp-sdk/adapters/gemini";

const { interactionsTools, classicTools, discovered } = await loadGeminiTools(
  "https://example.com/rcp/manifest",
  rcp,
  { serverName: "myApi" },
);
```

## Options

| Option                         | Type      | Notes                                                                      |
| ------------------------------ | --------- | -------------------------------------------------------------------------- |
| `serverName`                   | `string`  | Prefix for tool names: `"myApi__get_weather"`.                             |
| `prefixToolNameWithServerName` | `boolean` | If true and `serverName` is set, tool names become `serverName__toolName`. |
| `additionalToolNamePrefix`     | `string`  | Extra prefix applied before server name.                                   |
