# RCP LangChain Example

This example discovers tools from any RCP manifest and hands them to a LangChain agent.

## Prerequisites

- An RCP server running (e.g. `../express`)
- Node.js 18+

## Setup

```bash
# Terminal 1 — start the RCP server
cd ../express && npm install && npm start

# Terminal 2 — run this client
npm install
cp .env.example .env   # add your OPENAI_API_KEY
npm start -- "List my tasks, then mark the first incomplete one as done."
```

## What this demonstrates

1. `rcp.discover(manifestUrl)` — fetches and validates the RCP manifest
2. `rcpToolsToLangChainTools(tools, rcp)` — converts `DiscoveredTool[]` into LangChain `DynamicStructuredTool[]`
3. `createAgent({ model, tools })` — creates a LangChain agent with the RCP tools
4. `agent.invoke(...)` — runs the agent; the adapter handles resolver-bound params + response mappings transparently

## How it works

The adapter in `rcp-sdk/adapters/langchain` does three things:

- **Schema**: Converts `exposedParams` into a Zod object schema (what LangChain's `DynamicStructuredTool` expects)
- **Execution**: Each tool call delegates to `rcpClient.call(tool, args, ctx)`, which renders the URL, attaches auth, and makes the real HTTP request
- **Context**: You can pass a `context` provider to supply resolver-bound values (e.g. `userId`) that the model never sees

```ts
// The one-line version (discover + convert in one call)
import { loadRcpLangChainTools } from "rcp-sdk/adapters/langchain";

const tools = await loadRcpLangChainTools(manifestUrl, rcp, {
  context: { userId: "u_1" }, // resolver-bound value, hidden from model
  serverName: "myApi",        // prefixes tool names: myApi__tool_name
});
```
