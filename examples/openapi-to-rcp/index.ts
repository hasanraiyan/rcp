import { openapiToRcp } from "../../typescript/dist/openapi.js";
import { createRcpClient } from "../../typescript/dist/client.js";
import { createMcpBridge } from "../../typescript/dist/adapters/mcp.js";

const sampleOpenApi = {
  openapi: "3.0.0",
  info: { title: "Store API", version: "1.0.0" },
  servers: [{ url: "https://api.example.com/v1" }],
  paths: {
    "/orders": {
      get: {
        operationId: "list_orders",
        summary: "List user orders",
        parameters: [
          { name: "tenantId", in: "query", required: true, schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
      },
    },
    "/admin/delete": {
      post: {
        operationId: "admin_delete_order",
        summary: "Admin delete",
      },
    },
  },
};

async function main() {
  console.log("1. Converting OpenAPI spec to RCP manifest with policy filtering...");

  const { manifest, tools } = await openapiToRcp(sampleOpenApi, {
    include: ["list_*"],
    exclude: ["admin_*"],
    resolvers: {
      tenantId: (ctx: any) => ctx?.tenantId ?? "tenant_default",
    },
  });

  console.log(`Generated manifest version: ${manifest.rcpVersion}`);
  console.log(`Tools count: ${tools.length}`);
  console.log(`Tool name: ${tools[0].name}`);
  console.log(`Exposed parameters to model:`, tools[0].exposedParams.map((p) => p.name));

  console.log("\n2. Creating MCP bridge for client compatibility...");
  const client = createRcpClient({
    resolvers: {
      tenantId: () => "tenant_12345",
    },
  });

  const mcpBridge = createMcpBridge(client, tools);
  console.log("MCP Tool Schema:", JSON.stringify(mcpBridge.tools, null, 2));
}

main().catch(console.error);
