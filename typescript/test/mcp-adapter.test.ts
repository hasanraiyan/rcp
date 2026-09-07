import { describe, it, expect, vi } from "vitest";
import { rcpToolToMcpTool, rcpToolsToMcpTools, createMcpBridge } from "../src/adapters/mcp.js";
import { createRcpClient, type DiscoveredTool } from "../src/client.js";

const sampleTool: DiscoveredTool = {
  name: "get_order",
  description: "Get order details",
  method: "GET",
  url: "https://api.example.com/orders/{{orderId}}",
  params: [
    { name: "orderId", type: "string", required: true, description: "The order ID" },
    { name: "tenantId", type: "string", required: true, description: "The tenant ID" },
  ],
  exposedParams: [
    { name: "orderId", type: "string", required: true, description: "The order ID" },
  ],
};

describe("mcp adapter", () => {
  it("converts RCP tool to MCP tool definition using exposedParams", () => {
    const mcpTool = rcpToolToMcpTool(sampleTool);

    expect(mcpTool.name).toBe("get_order");
    expect(mcpTool.description).toBe("Get order details");
    expect(mcpTool.inputSchema.type).toBe("object");
    expect(mcpTool.inputSchema.properties.orderId).toEqual({
      type: "string",
      description: "The order ID",
    });
    expect(mcpTool.inputSchema.properties.tenantId).toBeUndefined();
    expect(mcpTool.inputSchema.required).toEqual(["orderId"]);
  });

  it("converts array of tools using rcpToolsToMcpTools", () => {
    const mcpTools = rcpToolsToMcpTools([sampleTool]);
    expect(mcpTools.length).toBe(1);
    expect(mcpTools[0]?.name).toBe("get_order");
  });

  it("creates MCP bridge and calls client tool", async () => {
    const mockClient = createRcpClient();
    vi.spyOn(mockClient, "call").mockResolvedValue({
      status: 200,
      ok: true,
      raw: { id: "123", status: "completed" },
      mapped: { id: "123", status: "completed" },
    });

    const bridge = createMcpBridge(mockClient, [sampleTool]);

    expect(bridge.tools.length).toBe(1);
    expect(bridge.tools[0]?.name).toBe("get_order");

    const response = await bridge.callTool("get_order", { orderId: "123" });

    expect(mockClient.call).toHaveBeenCalledWith(sampleTool, { orderId: "123" }, undefined);
    expect(response.isError).toBe(false);
    expect(response.content[0]?.text).toContain('"status": "completed"');
  });

  it("returns error format on tool execution failure", async () => {
    const mockClient = createRcpClient();
    vi.spyOn(mockClient, "call").mockRejectedValue(new Error("Network failed"));

    const bridge = createMcpBridge(mockClient, [sampleTool]);
    const response = await bridge.callTool("get_order", { orderId: "123" });

    expect(response.isError).toBe(true);
    expect(response.content[0]?.text).toBe("Network failed");
  });
});
