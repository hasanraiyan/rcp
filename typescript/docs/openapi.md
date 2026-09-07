# OpenAPI → RCP Adapter

RCP can act as an AI control and policy layer on top of existing OpenAPI specifications. Rather than creating a duplicate API description format, RCP consumes your canonical OpenAPI contract and applies filtering, parameter resolution, and policy controls to generate safe, AI-callable tools.

---

## 🚀 Quick Start

Import `openapiToRcp` from `rcp-sdk/openapi`:

```ts
import { openapiToRcp } from "rcp-sdk/openapi";

const { manifest, tools } = await openapiToRcp(
  "https://api.example.com/openapi.json",
  {
    include: ["list_*", "get_*"],
    exclude: ["admin_*", "internal_*"],
    resolvers: {
      tenantId: (ctx) => ctx.tenantId,
      userId: (ctx) => ctx.userId,
    },
  }
);
```

---

## 🛠️ Policy & Filtering Capabilities

### 1. Allow-listing (`include`) & Deny-listing (`exclude`)

OpenAPI specs can describe dozens of endpoints. RCP lets you specify wildcard/pattern filters so models only discover allowed tools:

```ts
const { tools } = await openapiToRcp(spec, {
  include: ["list_orders", "get_order", "create_*"],
  exclude: ["admin_*", "internal_*", "delete_*"],
});
```

### 2. Runtime Resolvers (`resolvers`)

Parameters such as `tenantId`, `userId`, or internal tenant context must never be filled or spoofed by an AI model.

RCP automatically strips resolver-bound parameters from the model-facing `exposedParams` list:

```ts
const { tools } = await openapiToRcp(spec, {
  resolvers: {
    tenantId: (ctx: any) => ctx.tenantId,
  },
});

// The model sees `limit` and `status`, but NEVER `tenantId`.
```

---

## 🖥️ CLI Usage

You can generate an RCP manifest directly from an OpenAPI specification file or URL using the RCP CLI:

```bash
npx rcp openapi --in openapi.json --out manifest.json --include "list_*,get_*" --exclude "admin_*"
```

Options:
- `--in, -i`: Path to local OpenAPI JSON/YAML file or HTTPS URL.
- `--out, -o`: Output path for generated RCP manifest JSON (defaults to stdout).
- `--include`: Comma-separated operationId allow-list patterns.
- `--exclude`: Comma-separated operationId deny-list patterns.
- `--resolvers`: Comma-separated parameter names to strip (e.g. `--resolvers tenantId,userId`).

---

## 🌉 MCP Bridge (`rcp-sdk/adapters/mcp`)

If your client expects an MCP-compatible tool schema, you can convert RCP tools directly or bridge execution:

```ts
import { createRcpClient } from "rcp-sdk/client";
import { openapiToRcp } from "rcp-sdk/openapi";
import { createMcpBridge } from "rcp-sdk/adapters/mcp";

const { tools } = await openapiToRcp("openapi.json");
const client = createRcpClient({
  resolvers: {
    tenantId: () => "tenant_123",
  },
});

const bridge = createMcpBridge(client, tools);

// Hand `bridge.tools` to MCP client, and delegate execution to `bridge.callTool(name, args, ctx)`
```
