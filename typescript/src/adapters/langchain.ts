/**
 * LangChain / LangGraph adapter for RCP.
 *
 * Mirrors `examples/openai-client/client.ts:toOpenAITool` but for the
 * LangChain ecosystem — converts `DiscoveredTool` (from `rcp-sdk/client`
 * `discover()`) into `DynamicStructuredTool` instances that can be passed
 * straight to `createAgent` / `ToolNode`.
 *
 * Design notes kept close to `@langchain/mcp-adapters` (`libs/langchain-mcp-adapters/src/tools.ts:26`
 * `loadMcpTools` + `client.ts:MultiServerMCPClient`) so consumers familiar
 * with the MCP adapter find the same shape here:
 *   - `rcpToolToLangChainTool`  <-> `convert_mcp_tool_to_langchain_tool`
 *   - `rcpToolsToLangChainTools` <-> `loadMcpTools`
 *   - `MultiServerRcpClient`     <-> `MultiServerMCPClient`
 *
 * The only required peer is `@langchain/core` (which `langchain` itself
 * re-exports). The adapter is a thin translation layer — no extra transport,
 * no persistence, no hidden state — RCP remains "discover is GET manifest,
 * execution is plain HTTP" (SPEC.md §Architecture).
 */

import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import type { RunnableConfig } from "@langchain/core/runnables";
import { createRcpClient, type CreateRcpClientOptions } from "../client.js";
import type { DiscoveredTool, CallResult } from "../client.js";
import type { RcpToolParam } from "../schema.js";

// `rcp-sdk/client` client type — using ReturnType to avoid circular import of the factory.
type RcpClient = {
  discover: (url: string, ctx?: unknown) => Promise<{ manifest: unknown; tools: DiscoveredTool[] }>;
  call: (
    tool: DiscoveredTool | import("../schema.js").RcpTool,
    args: Record<string, unknown>,
    ctx?: unknown,
  ) => Promise<CallResult>;
};

// Re-export for callers that want to type their `getTools()` result without reaching
// into `@langchain/core` themselves.
export type RcpLangChainTool = DynamicStructuredTool;

// ---------------------------------------------------------------------------
// Context resolution — RCP's trust boundary (SPEC.md §Resolvers)
// ---------------------------------------------------------------------------

/**
 * How the adapter obtains the `ctx` forwarded to `rcp.call(tool, args, ctx)`
 * which in turn drives resolver-bound params + injected headers.
 *
 * - A plain value: used as-is for every invocation.
 * - A zero-arg function: called per invocation (sync or async).
 * - A function that takes `RunnableConfig`: receives the LangChain run config
 *   so you can thread LangGraph state/context/store through.
 */
export type RcpContextProvider =
  | unknown
  | (() => unknown | Promise<unknown>)
  | ((config: RunnableConfig | undefined) => unknown | Promise<unknown>);

async function resolveContext(
  provider: RcpContextProvider | undefined,
  config: RunnableConfig | undefined,
): Promise<unknown> {
  if (provider === undefined) return undefined;
  if (typeof provider !== "function") return provider;
  const fn = provider as (arg?: unknown) => unknown | Promise<unknown>;
  // Call with config if the function declares a parameter; otherwise zero-arg.
  return fn.length > 0 ? await fn(config) : await (fn as () => unknown | Promise<unknown>)();
}

// ---------------------------------------------------------------------------
// Schema building — RCP exposedParams -> Zod object (the shape LangChain's
// StructuredTool expects). Mirrors rcp-sdk/server.ts:zodShapeToParams but in
// reverse, and keeps the same `required !== false` semantics as
// templateEngine.ts / SPEC.md §The manifest.
// ---------------------------------------------------------------------------

function buildZodSchema(params: RcpToolParam[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const param of params) {
    let field: z.ZodTypeAny;
    switch (param.type) {
      case "number":
        field = z.number();
        break;
      case "boolean":
        field = z.boolean();
        break;
      default:
        field = z.string();
        break;
    }
    if (param.description) field = field.describe(param.description);
    if (param.required === false) field = field.optional();
    shape[param.name] = field;
  }
  // If a tool declares no exposed params, expose the empty object (valid LLMschema).
  return z.object(shape);
}

// ---------------------------------------------------------------------------
// Naming — optional prefixing, like MCP's `prefixToolNameWithServerName`
// ---------------------------------------------------------------------------

export interface RcpToolNameOptions {
  /** Logical server name, e.g. `"ordersApi"` */
  serverName?: string;
  /** If true and serverName is set, tool names become `serverName__toolName` */
  prefixToolNameWithServerName?: boolean;
  /** Additional prefix, e.g. `"rcp"` -> `rcp__tool` or `rcp__server__tool` */
  additionalToolNamePrefix?: string;
}

function resolveToolName(base: string, opts: RcpToolNameOptions | undefined): string {
  const initial = opts?.additionalToolNamePrefix ? `${opts.additionalToolNamePrefix}__` : "";
  const server =
    opts?.prefixToolNameWithServerName && opts?.serverName ? `${opts.serverName}__` : "";
  return `${initial}${server}${base}`;
}

// ---------------------------------------------------------------------------
// Per-tool options
// ---------------------------------------------------------------------------

export interface RcpLangChainToolOptions extends RcpToolNameOptions {
  /**
   * Static context or provider called per invocation. This value is what
   * resolvers + header injectors receive as `ctx` (SPEC.md §Resolvers +
   * §Client-injected headers). The model never sees resolver-bound params.
   *
   * For a static value: `context: { userId: "u_1" }`
   * For a dynamic value: `context: () => ({ userId: getCurrentUserId() })`
   * For LangGraph state access: `context: (config) => (config?.configurable as any)?.ctx`
   */
  context?: RcpContextProvider;
  /**
   * Alias for `context` that makes the config-forwarding intent explicit.
   * If both `context` and `getContext` are set, `getContext` wins.
   */
  getContext?: RcpContextProvider;
  /**
   * Customize how a CallResult is serialized to the model. By default the
   * adapter returns `mapped` (responseMappings already applied) as a string:
   * plain string pass-through, otherwise `JSON.stringify(mapped)`.
   * Return anything JSON-serializable; LangChain will deliver it as the
   * ToolMessage content.
   */
  mapResult?: (result: CallResult, tool: DiscoveredTool) => unknown | Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Core conversion — DiscoveredTool -> DynamicStructuredTool
// ---------------------------------------------------------------------------

/**
 * Convert one RCP tool into a LangChain DynamicStructuredTool.
 *
 * The returned tool's `func` delegates to `rcpClient.call(tool, args, ctx)`,
 * applying resolver/header logic that was configured on the RCP client at
 * construction time. The model only ever sees `exposedParams`.
 *
 * @param tool - one entry from `rcp.discover()` `tools`
 * @param rcpClient - the same client instance used for discovery (carries
 *                    resolvers/headers/auth). A different instance with the
 *                    same options also works, but sharing is simpler.
 * @param options - naming + context provider + result mapping
 */
export function rcpToolToLangChainTool(
  tool: DiscoveredTool,
  rcpClient: RcpClient,
  options: RcpLangChainToolOptions = {},
): RcpLangChainTool {
  const name = resolveToolName(tool.name, options);
  const schema = buildZodSchema(tool.exposedParams);
  const contextProvider = options.getContext ?? options.context;

  const mapResult =
    options.mapResult ??
    ((result: CallResult) => {
      const payload = result.mapped;
      if (typeof payload === "string") return payload;
      if (payload === null || payload === undefined) {
        // Preserve raw text if the endpoint returned non-JSON text.
        if (typeof result.raw === "string") return result.raw;
        return JSON.stringify(payload);
      }
      try {
        return JSON.stringify(payload);
      } catch {
        return String(payload);
      }
    });

  return new DynamicStructuredTool({
    name,
    description: tool.description,
    schema,
    // DynamicStructuredTool's func receives (input, runManager, config).
    // We thread `config` into context resolution so LangGraph callers can
    // pull state/context/store via their getContext implementation.
    func: async (
      input: Record<string, unknown>,
      _runManager?: unknown,
      config?: RunnableConfig,
    ) => {
      const ctx = await resolveContext(contextProvider, config);
      let result: CallResult;
      try {
        result = await rcpClient.call(tool, input as Record<string, unknown>, ctx);
      } catch (err) {
        // Network/resolver/template failures: surface as a model-visible error
        // rather than crashing the agent turn (mirrors Python mcp's isError->ToolMessage).
        const message = err instanceof Error ? err.message : String(err);
        return `RCP tool "${tool.name}" failed: ${message}`;
      }
      // Always return mapped content — even on non-2xx, the payload is often
      // a useful error document the model can self-correct from. No throw.
      const mapped = await mapResult(result, tool);
      // DynamicStructuredTool accepts string | object; stringify objects for consistent ToolMessage.
      if (typeof mapped === "string") return mapped;
      if (mapped === null || mapped === undefined) return "";
      if (typeof mapped === "object") return JSON.stringify(mapped);
      return String(mapped);
    },
  }) as RcpLangChainTool;
}

/**
 * Convert many tools at once. Convenience over calling `rcpToolToLangChainTool`
 * in a loop, with shared naming/context options.
 */
export function rcpToolsToLangChainTools(
  tools: DiscoveredTool[],
  rcpClient: RcpClient,
  options: RcpLangChainToolOptions = {},
): RcpLangChainTool[] {
  return tools.map((t) => rcpToolToLangChainTool(t, rcpClient, options));
}

/**
 * One-call helper: discover a manifest and return LangChain tools bound to
 * the client that discovered them. Mirrors the `const { tools } = await client.discover(url)`
 * + `toLangChainTools()` two-step, for the common case.
 */
export async function loadRcpLangChainTools(
  manifestUrl: string,
  rcpClient: RcpClient,
  options: RcpLangChainToolOptions & { ctx?: unknown } = {},
): Promise<RcpLangChainTool[]> {
  const { ctx, ...toolOpts } = options as RcpLangChainToolOptions & { ctx?: unknown };
  const { tools } = await rcpClient.discover(manifestUrl, ctx);
  return rcpToolsToLangChainTools(tools, rcpClient, toolOpts);
}

// ---------------------------------------------------------------------------
// Multi-server client — parity with @langchain/mcp-adapters MultiServerMCPClient
// ---------------------------------------------------------------------------

export interface RcpServerConfig {
  /** Manifest URL, e.g. `https://api.example.com/rcp/manifest` */
  manifestUrl: string;
  /** Client options for this server (auth/resolvers/headers/logger) — forwarded to createRcpClient */
  clientOptions?: CreateRcpClientOptions;
  /** Optional explicit client instance; if supplied, manifestUrl is still required for discover() */
  client?: RcpClient;
}

export interface MultiServerRcpClientConfig {
  /** Map of server name -> config. Tool names can be prefixed with the map key. */
  servers: Record<string, RcpServerConfig>;
  /** Default naming behaviour applied to every server unless overridden per-call */
  prefixToolNameWithServerName?: boolean;
  additionalToolNamePrefix?: string;
  /** Throw if any manifest fails to load, or silently skip it (default: throw) */
  throwOnLoadError?: boolean;
}

/**
 * Manages multiple RCP manifests and aggregates their tools, like
 * `MultiServerMCPClient` does for MCP. Each server gets its own RcpClient
 * (so resolvers/auth stay isolated), and `getTools()` returns a flat
 * `DynamicStructuredTool[]` ready for `createAgent(..., tools)`.
 *
 * RCP has no persistent connection — "connection" here just means "has this
 * manifest been fetched once" — so there is no `close()` transport teardown
 * to worry about, but the method is provided for API parity.
 */
export class MultiServerRcpClient {
  private readonly config: MultiServerRcpClientConfig;
  private readonly clients: Map<string, RcpClient> = new Map();
  private readonly toolCache: Map<string, DiscoveredTool[]> = new Map();

  constructor(config: MultiServerRcpClientConfig) {
    if (!config.servers || Object.keys(config.servers).length === 0) {
      throw new Error("MultiServerRcpClient: no servers configured");
    }
    this.config = {
      throwOnLoadError: true,
      ...config,
    };
    // Pre-create clients so auth/resolver config is isolated per server.
    for (const [name, srv] of Object.entries(config.servers)) {
      if (srv.client) {
        this.clients.set(name, srv.client);
      } else {
        this.clients.set(name, createRcpClient(srv.clientOptions as never));
      }
    }
  }

  /**
   * Discover every configured manifest (or a filtered subset) and return
   * LangChain tools. Results are cached after the first successful fetch
   * per server.
   *
   * @param serverNames - if empty, all servers; otherwise only these keys
   * @param options - per-call naming/context overrides (merged over ctor defaults)
   * @param options.getContext - same semantics as rcpToolToLangChainTool; a single
   *                             provider is shared across servers, or use
   *                             `getContextForServer` for per-server ctx.
   * @param options.getContextForServer - per-server ctx provider (takes precedence)
   */
  async getTools(
    serverNames?: string[],
    options: RcpLangChainToolOptions & {
      getContextForServer?: Record<string, RcpContextProvider>;
      ctxForServer?: Record<string, unknown>;
    } = {},
  ): Promise<RcpLangChainTool[]> {
    const names = serverNames?.length ? serverNames : Object.keys(this.config.servers);
    const all: RcpLangChainTool[] = [];

    for (const name of names) {
      const srv = this.config.servers[name];
      const client = this.clients.get(name);
      if (!srv || !client) continue;

      let discovered: DiscoveredTool[];
      if (this.toolCache.has(name)) {
        discovered = this.toolCache.get(name)!;
      } else {
        try {
          const perServerCtx = options.getContextForServer?.[name] ?? options.ctxForServer?.[name];
          const ctx =
            perServerCtx !== undefined
              ? await resolveContext(perServerCtx as RcpContextProvider, undefined)
              : undefined;
          const { tools } = await client.discover(srv.manifestUrl, ctx);
          discovered = tools;
          this.toolCache.set(name, discovered);
        } catch (err) {
          if (this.config.throwOnLoadError) throw err;
          // skip this server
          continue;
        }
      }

      const perServerOpts: RcpLangChainToolOptions = {
        prefixToolNameWithServerName:
          options.prefixToolNameWithServerName ?? this.config.prefixToolNameWithServerName,
        additionalToolNamePrefix:
          options.additionalToolNamePrefix ?? this.config.additionalToolNamePrefix,
        serverName: name,
        context: options.getContextForServer?.[name] ?? options.context ?? options.getContext,
        getContext:
          (options.getContextForServer?.[name] as RcpContextProvider) ?? options.getContext,
        mapResult: options.mapResult,
      };
      // If caller used the `context` shorthand, thread it through correctly.
      if (options.context !== undefined && !options.getContext) {
        perServerOpts.context = options.context;
      }
      all.push(...rcpToolsToLangChainTools(discovered, client, perServerOpts));
    }

    return all;
  }

  /** Convenience: discover one server's tools only */
  async getToolsForServer(
    serverName: string,
    options: RcpLangChainToolOptions = {},
  ): Promise<RcpLangChainTool[]> {
    return this.getTools([serverName], options);
  }

  /** Expose the underlying RCP client for a server (e.g. to call `describeManifest` or raw `call`) */
  getClient(serverName: string): RcpClient | undefined {
    return this.clients.get(serverName);
  }

  /** Invalidate the cached discovery for one or all servers (forces re-fetch on next getTools) */
  invalidateCache(serverName?: string): void {
    if (serverName) this.toolCache.delete(serverName);
    else this.toolCache.clear();
  }

  /** No-op for RCP (no persistent transport), kept for MCP parity */
  async close(): Promise<void> {
    // nothing to tear down
  }
}
