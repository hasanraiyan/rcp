import type { RcpTool, RcpToolParam } from "../schema.js";
import type { createRcpClient, CallResult, DiscoveredTool } from "../client.js";

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

export function rcpToolToMcpTool(tool: RcpTool | DiscoveredTool): McpToolDefinition {
  const params: RcpToolParam[] = "exposedParams" in tool ? tool.exposedParams : tool.params;
  const properties: Record<string, { type: string; description?: string }> = {};
  const required: string[] = [];

  for (const param of params) {
    properties[param.name] = {
      type: param.type,
      ...(param.description ? { description: param.description } : {}),
    };
    if (param.required !== false) {
      required.push(param.name);
    }
  }

  return {
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: "object",
      properties,
      ...(required.length > 0 ? { required } : {}),
    },
  };
}

export function rcpToolsToMcpTools(tools: (RcpTool | DiscoveredTool)[]): McpToolDefinition[] {
  return tools.map((t) => rcpToolToMcpTool(t));
}

export interface McpBridge {
  tools: McpToolDefinition[];
  callTool: (
    name: string,
    args?: Record<string, unknown>,
    ctx?: unknown,
  ) => Promise<{
    content: Array<{ type: "text"; text: string }>;
    isError?: boolean;
  }>;
}

export function createMcpBridge(
  client: ReturnType<typeof createRcpClient>,
  tools: (RcpTool | DiscoveredTool)[],
): McpBridge {
  const mcpTools = rcpToolsToMcpTools(tools);
  const toolMap = new Map(tools.map((t) => [t.name, t]));

  return {
    tools: mcpTools,
    async callTool(name, args = {}, ctx) {
      const tool = toolMap.get(name);
      if (!tool) {
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
      }

      try {
        const result: CallResult = await client.call(tool, args, ctx);
        const textPayload =
          typeof result.mapped === "string"
            ? result.mapped
            : JSON.stringify(result.mapped ?? result.raw, null, 2);

        return {
          content: [{ type: "text", text: textPayload }],
          isError: !result.ok,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: error instanceof Error ? error.message : String(error),
            },
          ],
          isError: true,
        };
      }
    },
  };
}
