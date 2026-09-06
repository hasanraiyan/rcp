/**
 * Google GenAI (Gemini) adapter for RCP.
 *
 * Converts `DiscoveredTool` (from `rcp-sdk/client` `discover()`) into
 * Google GenAI function-calling format. Supports both:
 *   - **Interactions API**: `tools: [{ type: 'function', name, ... }]`
 *   - **Classic generateContent**: `tools: [{ functionDeclarations: [{ name, ... }] }]`
 *
 * Pass the result directly to `ai.interactions.create()` or
 * `ai.models.generateContent()` — no wrapper, no extra abstraction.
 */

import type { DiscoveredTool } from "../client.js";
import type { RcpToolParam } from "../schema.js";

// ---------------------------------------------------------------------------
// Gemini tool format types (inline — no `@google/genai` dep required)
// ---------------------------------------------------------------------------

export interface GeminiSchemaProperty {
  type: string;
  description?: string;
}

export interface GeminiSchema {
  type: "object";
  properties: Record<string, GeminiSchemaProperty>;
  required: string[];
}

/** Interactions API format — flat tool entry. */
export interface GeminiInteractionsTool {
  type: "function";
  name: string;
  description: string;
  parameters: GeminiSchema;
}

/** Classic generateContent format — wrapped in functionDeclarations. */
export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parametersJsonSchema: GeminiSchema;
}

export interface GeminiClassicTool {
  functionDeclarations: GeminiFunctionDeclaration[];
}

// ---------------------------------------------------------------------------
// Schema building — RCP exposedParams -> Gemini JSON Schema parameters
// ---------------------------------------------------------------------------

function buildParameters(params: RcpToolParam[]): GeminiSchema {
  const properties: Record<string, GeminiSchemaProperty> = {};
  const required: string[] = [];

  for (const param of params) {
    properties[param.name] = {
      type: param.type,
      ...(param.description ? { description: param.description } : {}),
    };
    if (param.required !== false) required.push(param.name);
  }

  return { type: "object", properties, required };
}

// ---------------------------------------------------------------------------
// Naming — optional prefixing
// ---------------------------------------------------------------------------

export interface GeminiToolNameOptions {
  /** Logical server name, e.g. `"ordersApi"` */
  serverName?: string;
  /** If true and serverName is set, tool names become `serverName__toolName` */
  prefixToolNameWithServerName?: boolean;
  /** Additional prefix, e.g. `"rcp"` -> `rcp__tool` or `rcp__server__tool` */
  additionalToolNamePrefix?: string;
}

function resolveToolName(base: string, opts: GeminiToolNameOptions | undefined): string {
  const initial = opts?.additionalToolNamePrefix ? `${opts.additionalToolNamePrefix}__` : "";
  const server =
    opts?.prefixToolNameWithServerName && opts?.serverName ? `${opts.serverName}__` : "";
  return `${initial}${server}${base}`;
}

// ---------------------------------------------------------------------------
// Core conversion — DiscoveredTool -> Gemini tool formats
// ---------------------------------------------------------------------------

/**
 * Convert one RCP tool into Gemini Interactions API format.
 *
 * Pass the result to `ai.interactions.create({ tools: [tool] })`.
 */
export function rcpToolToGeminiInteractionsTool(
  tool: DiscoveredTool,
  options?: GeminiToolNameOptions,
): GeminiInteractionsTool {
  const name = resolveToolName(tool.name, options);
  return {
    type: "function",
    name,
    description: tool.description,
    parameters: buildParameters(tool.exposedParams),
  };
}

/**
 * Convert an array of RCP tools into Gemini Interactions API format.
 */
export function rcpToolsToGeminiInteractionsTools(
  tools: DiscoveredTool[],
  options?: GeminiToolNameOptions,
): GeminiInteractionsTool[] {
  return tools.map((tool) => rcpToolToGeminiInteractionsTool(tool, options));
}

/**
 * Convert one RCP tool into Gemini classic `generateContent` format.
 *
 * Pass the result inside `tools: [{ functionDeclarations: [decl] }]`.
 */
export function rcpToolToGeminiFunctionDeclaration(
  tool: DiscoveredTool,
  options?: GeminiToolNameOptions,
): GeminiFunctionDeclaration {
  const name = resolveToolName(tool.name, options);
  return {
    name,
    description: tool.description,
    parametersJsonSchema: buildParameters(tool.exposedParams),
  };
}

/**
 * Convert an array of RCP tools into Gemini classic `generateContent` format.
 * Returns the `tools` array for `ai.models.generateContent({ config: { tools } })`.
 */
export function rcpToolsToGeminiClassicTools(
  tools: DiscoveredTool[],
  options?: GeminiToolNameOptions,
): GeminiClassicTool[] {
  return [
    {
      functionDeclarations: tools.map((tool) => rcpToolToGeminiFunctionDeclaration(tool, options)),
    },
  ];
}

// ---------------------------------------------------------------------------
// Discovery + conversion in one call
// ---------------------------------------------------------------------------

type RcpClient = {
  discover: (url: string, ctx?: unknown) => Promise<{ manifest: unknown; tools: DiscoveredTool[] }>;
};

/**
 * Discover tools from an RCP manifest URL and convert them to Gemini format.
 *
 * Returns both `interactionsTools` (for the Interactions API) and
 * `classicTools` (for `generateContent`).
 */
export async function loadGeminiTools(
  manifestUrl: string,
  client: RcpClient,
  options?: GeminiToolNameOptions,
): Promise<{
  interactionsTools: GeminiInteractionsTool[];
  classicTools: GeminiClassicTool[];
  discovered: DiscoveredTool[];
}> {
  const { tools: discovered } = await client.discover(manifestUrl);
  const interactionsTools = rcpToolsToGeminiInteractionsTools(discovered, options);
  const classicTools = rcpToolsToGeminiClassicTools(discovered, options);
  return { interactionsTools, classicTools, discovered };
}
