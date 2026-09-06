/**
 * OpenAI adapter for RCP.
 *
 * Converts `DiscoveredTool` (from `rcp-sdk/client` `discover()`) into OpenAI
 * function-calling format (`ChatCompletionTool`). Pass the result directly to
 * the OpenAI SDK — no wrapper, no extra abstraction.
 *
 * Usage:
 *   const { tools } = await rcp.discover(manifestUrl);
 *   const openaiTools = rcpToolsToOpenAiTools(tools);
 *   const completion = await openai.chat.completions.create({ model, messages, tools: openaiTools });
 */

import type { DiscoveredTool } from "../client.js";
import type { RcpToolParam } from "../schema.js";

// ---------------------------------------------------------------------------
// OpenAI tool format types (inline — no `openai` dep required)
// ---------------------------------------------------------------------------

export interface OpenAiFunctionParameterProperty {
  type: string;
  description?: string;
}

/**
 * OpenAI's `FunctionParameters` is `{ [key: string]: unknown }` — a plain
 * record with an index signature. We define specific fields for docs/type-hints
 * but extend `Record<string, unknown>` so the result is directly assignable to
 * `ChatCompletionTool[]` without casting.
 */
export type OpenAiFunctionParameters = {
  type: "object";
  properties: Record<string, OpenAiFunctionParameterProperty>;
  required: string[];
  additionalProperties: false;
} & Record<string, unknown>;

export interface OpenAiFunction {
  name: string;
  description: string;
  parameters: OpenAiFunctionParameters;
}

export interface OpenAiTool {
  type: "function";
  function: OpenAiFunction;
}

// ---------------------------------------------------------------------------
// Schema building — RCP exposedParams -> OpenAI JSON Schema parameters
// ---------------------------------------------------------------------------

function buildParameters(params: RcpToolParam[]): OpenAiFunctionParameters {
  const properties: Record<string, OpenAiFunctionParameterProperty> = {};
  const required: string[] = [];

  for (const param of params) {
    properties[param.name] = {
      type: param.type,
      ...(param.description ? { description: param.description } : {}),
    };
    if (param.required !== false) required.push(param.name);
  }

  return { type: "object", properties, required, additionalProperties: false };
}

// ---------------------------------------------------------------------------
// Naming — optional prefixing
// ---------------------------------------------------------------------------

export interface OpenAiToolNameOptions {
  /** Logical server name, e.g. `"ordersApi"` */
  serverName?: string;
  /** If true and serverName is set, tool names become `serverName__toolName` */
  prefixToolNameWithServerName?: boolean;
  /** Additional prefix, e.g. `"rcp"` -> `rcp__tool` or `rcp__server__tool` */
  additionalToolNamePrefix?: string;
}

function resolveToolName(base: string, opts: OpenAiToolNameOptions | undefined): string {
  const initial = opts?.additionalToolNamePrefix ? `${opts.additionalToolNamePrefix}__` : "";
  const server =
    opts?.prefixToolNameWithServerName && opts?.serverName ? `${opts.serverName}__` : "";
  return `${initial}${server}${base}`;
}

// ---------------------------------------------------------------------------
// Core conversion — DiscoveredTool -> OpenAiTool
// ---------------------------------------------------------------------------

/**
 * Convert one RCP tool into OpenAI function-calling format.
 */
export function rcpToolToOpenAiTool(
  tool: DiscoveredTool,
  options?: OpenAiToolNameOptions,
): OpenAiTool {
  const name = resolveToolName(tool.name, options);
  return {
    type: "function",
    function: {
      name,
      description: tool.description,
      parameters: buildParameters(tool.exposedParams),
    },
  };
}

/**
 * Convert an array of RCP tools into OpenAI function-calling format.
 */
export function rcpToolsToOpenAiTools(
  tools: DiscoveredTool[],
  options?: OpenAiToolNameOptions,
): OpenAiTool[] {
  return tools.map((tool) => rcpToolToOpenAiTool(tool, options));
}

// ---------------------------------------------------------------------------
// Discovery + conversion in one call
// ---------------------------------------------------------------------------

type RcpClient = {
  discover: (url: string, ctx?: unknown) => Promise<{ manifest: unknown; tools: DiscoveredTool[] }>;
};

/**
 * Discover tools from an RCP manifest URL and convert them to OpenAI format.
 */
export async function loadOpenAiTools(
  manifestUrl: string,
  client: RcpClient,
  options?: OpenAiToolNameOptions,
): Promise<{ tools: OpenAiTool[]; discovered: DiscoveredTool[] }> {
  const { tools: discovered } = await client.discover(manifestUrl);
  const tools = rcpToolsToOpenAiTools(discovered, options);
  return { tools, discovered };
}
