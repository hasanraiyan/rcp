import { describe, it, expect, vi } from "vitest";
import { openapiToRcp } from "../src/openapi.js";

const sampleOpenApiSpec = {
  openapi: "3.0.0",
  info: { title: "Sample API", version: "1.0.0" },
  servers: [{ url: "https://api.example.com/v1" }],
  paths: {
    "/orders": {
      get: {
        operationId: "list_orders",
        summary: "List all orders",
        parameters: [
          { name: "tenantId", in: "query", required: true, schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
      },
      post: {
        operationId: "create_order",
        summary: "Create a new order",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["item"],
                properties: {
                  item: { type: "string", description: "Item name" },
                  quantity: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    "/orders/{id}": {
      get: {
        operationId: "get_order",
        summary: "Get order details",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
      },
      delete: {
        operationId: "admin_delete_order",
        summary: "Delete order",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
      },
    },
    "/internal/health": {
      get: {
        operationId: "internal_health",
        summary: "Internal health check",
      },
    },
  },
};

describe("openapiToRcp", () => {
  it("converts OpenAPI spec object into RCP manifest and discovered tools", async () => {
    const result = await openapiToRcp(sampleOpenApiSpec);

    expect(result.manifest.rcpVersion).toBe("0.1");
    expect(result.tools.length).toBe(5);

    const listOrders = result.tools.find((t) => t.name === "list_orders");
    expect(listOrders).toBeDefined();
    expect(listOrders?.method).toBe("GET");
    expect(listOrders?.url).toBe("https://api.example.com/v1/orders");
    expect(listOrders?.queryParams).toEqual({ tenantId: "{{tenantId}}", limit: "{{limit}}" });
    expect(listOrders?.params.length).toBe(2);
  });

  it("filters tools using include option with wildcards", async () => {
    const result = await openapiToRcp(sampleOpenApiSpec, {
      include: ["list_*", "get_*"],
    });

    const toolNames = result.tools.map((t) => t.name);
    expect(toolNames).toContain("list_orders");
    expect(toolNames).toContain("get_order");
    expect(toolNames).not.toContain("create_order");
    expect(toolNames).not.toContain("admin_delete_order");
  });

  it("filters tools using exclude option with wildcards", async () => {
    const result = await openapiToRcp(sampleOpenApiSpec, {
      exclude: ["admin_*", "internal_*"],
    });

    const toolNames = result.tools.map((t) => t.name);
    expect(toolNames).toContain("list_orders");
    expect(toolNames).toContain("create_order");
    expect(toolNames).toContain("get_order");
    expect(toolNames).not.toContain("admin_delete_order");
    expect(toolNames).not.toContain("internal_health");
  });

  it("strips resolver-bound parameters from exposedParams", async () => {
    const result = await openapiToRcp(sampleOpenApiSpec, {
      resolvers: {
        tenantId: (ctx: any) => ctx.tenantId,
      },
    });

    const listOrders = result.tools.find((t) => t.name === "list_orders");
    expect(listOrders).toBeDefined();

    const paramNames = listOrders?.params.map((p) => p.name);
    expect(paramNames).toContain("tenantId");
    expect(paramNames).toContain("limit");

    const exposedNames = listOrders?.exposedParams.map((p) => p.name);
    expect(exposedNames).not.toContain("tenantId");
    expect(exposedNames).toContain("limit");
  });

  it("handles request bodies and maps properties to parameters", async () => {
    const result = await openapiToRcp(sampleOpenApiSpec);
    const createOrder = result.tools.find((t) => t.name === "create_order");

    expect(createOrder).toBeDefined();
    expect(createOrder?.method).toBe("POST");
    expect(createOrder?.body).toEqual({ item: "{{item}}", quantity: "{{quantity}}" });

    const itemParam = createOrder?.params.find((p) => p.name === "item");
    expect(itemParam).toBeDefined();
    expect(itemParam?.required).toBe(true);
    expect(itemParam?.description).toBe("Item name");
  });

  it("supports remote fetching of OpenAPI specs", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(sampleOpenApiSpec),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await openapiToRcp("https://api.example.com/openapi.json");
    expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/openapi.json");
    expect(result.tools.length).toBe(5);

    vi.unstubAllGlobals();
  });
});
