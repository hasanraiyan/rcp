# RCP Gemini Client Example

This example discovers tools from any RCP manifest and hands them to Google GenAI (Gemini).

## Prerequisites

- An RCP server running (e.g. `../express`)
- Node.js 18+

## Setup

```bash
# Terminal 1 — start the RCP server
cd ../express && npm install && npm start

# Terminal 2 — run this client
npm install
cp .env.example .env   # add your GEMINI_API_KEY
npm start -- "List my tasks, then mark the first incomplete one as done."
```

## What this demonstrates

1. `rcp.discover(manifestUrl)` — fetches and validates the RCP manifest
2. `rcpToolsToGeminiInteractionsTools(tools)` — converts `DiscoveredTool[]` into Gemini Interactions API format
3. `ai.interactions.create({ tools })` — runs Gemini with the RCP tools
4. Tool calls are executed via `rcp.call()` and results fed back to the model

## How it works

The adapter in `rcp-sdk/adapters/gemini` does three things:

- **Schema**: Converts `exposedParams` into a JSON Schema `parameters` object
- **Format**: Produces `{ type: 'function', name, description, parameters }` for the Interactions API, or `{ functionDeclarations: [...] }` for `generateContent`
- **Naming**: Optional `serverName` prefixing for multi-server setups

```ts
// The one-line version (discover + convert in one call)
import { loadGeminiTools } from "rcp-sdk/adapters/gemini";

const { interactionsTools, classicTools } = await loadGeminiTools(manifestUrl, rcp);

// Or use classic generateContent format
const response = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: prompt,
  config: { tools: classicTools },
});
```
