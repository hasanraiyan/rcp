import {
  RcpManifestSchema,
  SUPPORTED_RCP_VERSION,
  type RcpManifest,
  type RcpTool,
  type RcpToolParam,
} from "./schema.js";
import {
  collectTokenNames,
  renderDeep,
  renderRecord,
  renderTemplateString,
  MissingTemplateValueError,
} from "./templateEngine.js";
import { applyResponseMappings } from "./responseMapper.js";

// Re-exported so a caller can `instanceof`-check every error call() can
// throw from a single import, without also reaching into templateEngine.js.
export { MissingTemplateValueError } from "./templateEngine.js";

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * How this client authenticates itself to one registered server. Unlike
 * the manifest's own `auth` (which only declares a *shape*), this carries
 * the real secret — it's local configuration, never serialized anywhere
 * (RCP_SPEC.md §Security & trust, "Secrets are client-side only").
 */
export type RcpClientAuth =
  | { type: "none" }
  | { type: "header"; header?: string; scheme?: string; secret: string }
  | { type: "oauth2" };

export type RcpResolver = (ctx: unknown) => unknown;
export type RcpHeaderInjector = (ctx: unknown) => string;

export interface RcpLogger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

/** Silent by default — pass `logger: console` (or your own logger) to see anything. */
const noopLogger: RcpLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

export interface CreateRcpClientOptions {
  auth?: RcpClientAuth;
  /** Param name -> value resolver, never asked of the model (RCP_SPEC.md §Resolvers). */
  resolvers?: Record<string, RcpResolver>;
  /** Header name -> value, attached to every request (RCP_SPEC.md §Client-injected headers). */
  headers?: Record<string, RcpHeaderInjector>;
  /**
   * Structural logging only — tool name, method, status, param *names*.
   * Never headers, body, secrets, or resolved/rendered values (same
   * discipline as any server logging a request: log what happened, not
   * what was in it). Defaults to a no-op logger.
   */
  logger?: RcpLogger;
}

export interface DiscoveredTool extends RcpTool {
  /** `params` with every resolver-bound name removed — safe to show a model. */
  exposedParams: RcpToolParam[];
}

export interface DiscoverResult {
  manifest: RcpManifest;
  tools: DiscoveredTool[];
}

export interface CallResult {
  status: number;
  ok: boolean;
  raw: unknown;
  mapped: unknown;
}

export class RcpAuthNotImplementedError extends Error {}
export class RcpVersionMismatchError extends Error {}
export class RcpManifestValidationError extends Error {}
export class RcpResolverError extends Error {}
export class RcpToolAuthOverrideNotImplementedError extends Error {}

function appendQuery(url: string, queryParams: Record<string, string>): string {
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== "" && value !== undefined && value !== null) {
      parsed.searchParams.set(key, value);
    }
  }
  return parsed.toString();
}

/**
 * Creates one client bound to one server's auth/resolvers/headers
 * configuration. Registering a second server means calling this again —
 * there's no multi-server registry inside a single instance, matching how
 * RCP_SPEC.md's own "Reference SDK" section sketches it.
 */
export function createRcpClient(options: CreateRcpClientOptions = {}) {
  if (options.auth?.type === "oauth2") {
    throw new RcpAuthNotImplementedError(
      "auth.type 'oauth2' is specified in RCP_SPEC.md but not implemented by this reference " +
        "client yet — use 'none' or 'header'.",
    );
  }

  const resolvers = options.resolvers ?? {};
  const injectedHeaders = options.headers ?? {};
  const logger = options.logger ?? noopLogger;

  function buildAuthHeaders(): Record<string, string> {
    if (!options.auth || options.auth.type !== "header") return {};
    const header = options.auth.header ?? "Authorization";
    const scheme = options.auth.scheme ?? "Bearer";
    const value = scheme ? `${scheme} ${options.auth.secret}` : options.auth.secret;
    return { [header]: value };
  }

  function buildInjectedHeaders(ctx: unknown): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [name, fn] of Object.entries(injectedHeaders)) {
      out[name] = fn(ctx);
    }
    return out;
  }

  async function discover(url: string, ctx?: unknown): Promise<DiscoverResult> {
    logger.info(`[RCP] discover: GET ${url}`);

    const res = await fetch(url, {
      method: "GET",
      headers: { ...buildAuthHeaders(), ...buildInjectedHeaders(ctx) },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) {
      logger.error(`[RCP] discover: ${url} responded with status ${res.status}`);
      throw new Error(`Manifest fetch failed: ${url} responded with status ${res.status}.`);
    }

    const json = await res.json();
    const parsed = RcpManifestSchema.safeParse(json);
    if (!parsed.success) {
      logger.error(`[RCP] discover: manifest at ${url} failed schema validation`);
      throw new RcpManifestValidationError(
        `Manifest at ${url} failed validation: ${parsed.error.message}`,
      );
    }

    const manifest = parsed.data;
    if (manifest.rcpVersion !== SUPPORTED_RCP_VERSION) {
      logger.error(
        `[RCP] discover: ${url} declares rcpVersion "${manifest.rcpVersion}", expected "${SUPPORTED_RCP_VERSION}"`,
      );
      throw new RcpVersionMismatchError(
        `Manifest at ${url} declares rcpVersion "${manifest.rcpVersion}", but this client only ` +
          `supports "${SUPPORTED_RCP_VERSION}".`,
      );
    }

    const tools: DiscoveredTool[] = manifest.tools.map((tool) => ({
      ...tool,
      exposedParams: tool.params.filter((param) => !(param.name in resolvers)),
    }));

    logger.info(
      `[RCP] discover: found ${tools.length} tool(s) at ${url} (auth: ${manifest.auth.type}): ` +
        tools.map((t) => t.name).join(", "),
    );
    for (const tool of tools) {
      const hidden = tool.params.filter((p) => !tool.exposedParams.includes(p));
      if (hidden.length > 0) {
        logger.info(
          `[RCP] discover: "${tool.name}" hides ${hidden.length} resolver-bound param(s) from the model: ` +
            hidden.map((p) => p.name).join(", "),
        );
      }
    }

    return { manifest, tools };
  }

  async function call(
    tool: RcpTool,
    agentArgs: Record<string, unknown> = {},
    ctx?: unknown,
  ): Promise<CallResult> {
    logger.info(`[RCP] call: "${tool.name}" (${tool.method})`);

    if (tool.auth) {
      logger.error(`[RCP] call: "${tool.name}" declares an unsupported per-tool auth override`);
      throw new RcpToolAuthOverrideNotImplementedError(
        `Tool "${tool.name}" declares its own auth override, but per-tool auth overrides aren't ` +
          `implemented by this reference client yet — register it via a separate ` +
          `createRcpClient() instance instead.`,
      );
    }

    const tokenNames = collectTokenNames(tool);
    const values: Record<string, unknown> = {};

    for (const name of tokenNames) {
      const resolver = resolvers[name];
      if (resolver) {
        const resolved = resolver(ctx);
        if (resolved === undefined || resolved === null) {
          logger.error(`[RCP] call: "${tool.name}" resolver for "${name}" produced no value`);
          throw new RcpResolverError(
            `Tool "${tool.name}" needs {{${name}}}, resolved via a registered resolver, but it ` +
              `produced no value for this call.`,
          );
        }
        values[name] = resolved;
        continue;
      }

      const param = tool.params.find((p) => p.name === name);
      const value = agentArgs[name];
      if ((value === undefined || value === null) && param?.required !== false) {
        logger.error(`[RCP] call: "${tool.name}" missing required value for "${name}"`);
        throw new MissingTemplateValueError(
          `Tool "${tool.name}" requires a value for {{${name}}}, but none was supplied.`,
        );
      }
      values[name] = value;
    }

    const renderedUrl = renderTemplateString(tool.url, values);
    const renderedQuery = renderRecord(tool.queryParams, values);
    const renderedHeaders = renderRecord(tool.headers, values);
    const renderedBody = tool.body !== undefined ? renderDeep(tool.body, values) : undefined;

    const headers: Record<string, string> = {
      ...(renderedBody !== undefined ? { "Content-Type": "application/json" } : {}),
      ...renderedHeaders,
      ...buildAuthHeaders(),
      ...buildInjectedHeaders(ctx),
    };

    const res = await fetch(appendQuery(renderedUrl, renderedQuery), {
      method: tool.method,
      headers,
      body: renderedBody !== undefined ? JSON.stringify(renderedBody) : undefined,
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (res.ok) {
      logger.info(`[RCP] call: "${tool.name}" -> ${res.status}`);
    } else {
      logger.warn(`[RCP] call: "${tool.name}" -> ${res.status}`);
    }

    const text = await res.text();
    let raw: unknown;
    try {
      raw = text ? JSON.parse(text) : null;
    } catch {
      raw = text;
    }

    return {
      status: res.status,
      ok: res.ok,
      raw,
      mapped: applyResponseMappings(raw, tool.responseMappings),
    };
  }

  return { discover, call };
}

/**
 * Pretty-prints what a discovered manifest is asking for — its auth
 * requirement, and every tool's params, flagging which ones a resolver
 * already hides from the model. Meant for a developer setting up a new
 * server registration to read (`console.log(describeManifest(...))`),
 * not for anything programmatic.
 */
export function describeManifest(manifest: RcpManifest, tools: DiscoveredTool[]): string {
  const lines: string[] = [];
  lines.push(`RCP manifest v${manifest.rcpVersion} — auth: ${describeAuth(manifest.auth)}`);
  lines.push(`${tools.length} tool(s):`);

  for (const tool of tools) {
    lines.push(`  - ${tool.name} (${tool.method}) — ${tool.description}`);
    for (const param of tool.params) {
      const hidden = !tool.exposedParams.includes(param);
      const requiredLabel = param.required === false ? "optional" : "required";
      const hiddenLabel = hidden ? " [resolved by client, hidden from model]" : "";
      const descriptionLabel = param.description ? ` — ${param.description}` : "";
      lines.push(
        `      ${param.name}: ${param.type}, ${requiredLabel}${hiddenLabel}${descriptionLabel}`,
      );
    }
  }

  return lines.join("\n");
}

function describeAuth(auth: RcpManifest["auth"]): string {
  if (auth.type === "none") return "none";
  if (auth.type === "header") {
    return `header "${auth.header}"${auth.scheme ? ` (scheme: ${auth.scheme})` : ""}`;
  }
  return `oauth2 (resource: ${auth.resource})`;
}
