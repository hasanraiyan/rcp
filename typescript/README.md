# RCP — REST Connector Protocol

A lightweight, open protocol for exposing REST APIs as AI-callable tools — without running a
protocol server. If MCP is the right fit when you need rich, stateful capabilities, RCP is for the
much more common case: you already have a REST API, and you just want an AI application to be
able to call some of its endpoints as tools.

## The shape of it

A **server** publishes a plain JSON manifest at a URL. A **client** fetches it, builds callable
tools from it, and calls the endpoints it describes directly — no JSON-RPC, no persistent
connection.

```
Client                             Server
------                             ------
GET  <manifest-url>          -->  200 { "rcpVersion": "0.1", "tools": [...] }
...model picks a tool...
<method> <tool's own url>    -->  (whatever that endpoint normally returns)
```

## This package

`rcp-sdk` ships four entry points:

```ts
// Building the AI application? Import the client.
import { createRcpClient } from "rcp-sdk/client";

// Exposing your own REST endpoints as tools? Import the server helper.
import { defineTool } from "rcp-sdk/server";

// Using OpenAI? Import the adapter to convert RCP tools to OpenAI format.
import { rcpToolsToOpenAiTools, loadOpenAiTools } from "rcp-sdk/adapters/openai";

// Using LangChain? Import the adapter to convert RCP tools to LangChain tools.
import { rcpToolsToLangChainTools, loadRcpLangChainTools } from "rcp-sdk/adapters/langchain";
```

See [`examples/basic`](./examples/basic) for a minimal end-to-end example: a tiny server exposing
one tool, and a client discovering + calling it.

## LangChain adapter

The `rcp-sdk/adapters/langchain` entry point converts RCP-discovered tools into LangChain
`DynamicStructuredTool` instances. It handles schema conversion, response mapping, and
resolver-bound context injection automatically.

```ts
import { createRcpClient } from "rcp-sdk/client";
import { rcpToolsToLangChainTools, loadRcpLangChainTools } from "rcp-sdk/adapters/langchain";

const rcp = createRcpClient();

// One-call: discover + convert
const tools = await loadRcpLangChainTools("https://example.com/rcp/manifest", rcp, {
  context: { userId: "u_1" }, // resolver-bound values, hidden from model
  serverName: "myApi", // prefixes tool names: myApi__tool_name
});

// Or manually: discover then convert
const { tools } = await rcp.discover("https://example.com/rcp/manifest");
const langchainTools = rcpToolsToLangChainTools(tools, rcp);

// Pass to any LangChain agent or chain
import { createAgent } from "langchain";
const agent = createAgent({ model: "gpt-4o-mini", tools: langchainTools });
```

See [`examples/langchain-client`](../examples/langchain-client) for a full interactive chat example.

## Docs

- [`docs/client.md`](./docs/client.md) — `createRcpClient()` API reference: options, `discover()`,
  `call()`, logging, `describeManifest()`, error classes.
- [`docs/server.md`](./docs/server.md) — `defineTool()` API reference: options, `t.arg()`, how
  `args` maps to manifest params.
- [`docs/langchain.md`](./docs/langchain.md) — LangChain adapter API reference: options,
  context providers, `MultiServerRcpClient`.
- [`docs/openai.md`](./docs/openai.md) — OpenAI adapter API reference: tool format conversion.

## Status

v0.2.0, in active design.

- Auth: `none` and `header` are implemented; `oauth2` is fully specified but throws
  "not implemented" at runtime.
- Per-tool `auth` overrides (a tool declaring different auth than its server's default) aren't
  implemented yet — `call()` throws rather than silently using the wrong credentials.
- Resolvers, client-injected headers, and pluggable logging (silent by default) are implemented
  and tested — see `docs/client.md`.
- LangChain adapter: `rcpToolsToLangChainTools`, `loadRcpLangChainTools`, `MultiServerRcpClient`,
  and `rcpToolToLangChainTool` are implemented and tested (43 tests).
- OpenAI adapter: `rcpToolToOpenAiTool`, `rcpToolsToOpenAiTools`, `loadOpenAiTools` are
  implemented and tested (10 tests).
- No `skills`/resources-equivalent primitive — tools only, for now.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm example   # runs examples/basic/run.ts end-to-end
```
