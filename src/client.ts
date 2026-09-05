import {
  RcpManifestSchema,
  SUPPORTED_RCP_VERSION,
  type RcpManifest,
  type RcpTool,
  type RcpToolParam,
} from './schema.js';
import {
  collectTokenNames,
  renderDeep,
  renderRecord,
  renderTemplateString,
  MissingTemplateValueError,
} from './templateEngine.js';
import { applyResponseMappings } from './responseMapper.js';

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * How this client authenticates itself to one registered server. Unlike
 * the manifest's own `auth` (which only declares a *shape*), this carries
 * the real secret — it's local configuration, never serialized anywhere
 * (RCP_SPEC.md §Security & trust, "Secrets are client-side only").
 */
export type RcpClientAuth =
  | { type: 'none' }
  | { type: 'header'; header?: string; scheme?: string; secret: string }
  | { type: 'oauth2' };

export type RcpResolver = (ctx: unknown) => unknown;
export type RcpHeaderInjector = (ctx: unknown) => string;

export interface CreateRcpClientOptions {
  auth?: RcpClientAuth;
  /** Param name -> value resolver, never asked of the model (RCP_SPEC.md §Resolvers). */
  resolvers?: Record<string, RcpResolver>;
  /** Header name -> value, attached to every request (RCP_SPEC.md §Client-injected headers). */
  headers?: Record<string, RcpHeaderInjector>;
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
    if (value !== '' && value !== undefined && value !== null) {
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
  if (options.auth?.type === 'oauth2') {
    throw new RcpAuthNotImplementedError(
      "auth.type 'oauth2' is specified in RCP_SPEC.md but not implemented by this reference " +
        "client yet — use 'none' or 'header'."
    );
  }

  const resolvers = options.resolvers ?? {};
  const injectedHeaders = options.headers ?? {};

  function buildAuthHeaders(): Record<string, string> {
    if (!options.auth || options.auth.type !== 'header') return {};
    const header = options.auth.header ?? 'Authorization';
    const scheme = options.auth.scheme ?? 'Bearer';
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
    const res = await fetch(url, {
      method: 'GET',
      headers: { ...buildAuthHeaders(), ...buildInjectedHeaders(ctx) },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`Manifest fetch failed: ${url} responded with status ${res.status}.`);
    }

    const json = await res.json();
    const parsed = RcpManifestSchema.safeParse(json);
    if (!parsed.success) {
      throw new RcpManifestValidationError(
        `Manifest at ${url} failed validation: ${parsed.error.message}`
      );
    }

    const manifest = parsed.data;
    if (manifest.rcpVersion !== SUPPORTED_RCP_VERSION) {
      throw new RcpVersionMismatchError(
        `Manifest at ${url} declares rcpVersion "${manifest.rcpVersion}", but this client only ` +
          `supports "${SUPPORTED_RCP_VERSION}".`
      );
    }

    const tools: DiscoveredTool[] = manifest.tools.map((tool) => ({
      ...tool,
      exposedParams: tool.params.filter((param) => !(param.name in resolvers)),
    }));

    return { manifest, tools };
  }

  async function call(
    tool: RcpTool,
    agentArgs: Record<string, unknown> = {},
    ctx?: unknown
  ): Promise<CallResult> {
    if (tool.auth) {
      throw new RcpToolAuthOverrideNotImplementedError(
        `Tool "${tool.name}" declares its own auth override, but per-tool auth overrides aren't ` +
          `implemented by this reference client yet — register it via a separate ` +
          `createRcpClient() instance instead.`
      );
    }

    const tokenNames = collectTokenNames(tool);
    const values: Record<string, unknown> = {};

    for (const name of tokenNames) {
      const resolver = resolvers[name];
      if (resolver) {
        const resolved = resolver(ctx);
        if (resolved === undefined || resolved === null) {
          throw new RcpResolverError(
            `Tool "${tool.name}" needs {{${name}}}, resolved via a registered resolver, but it ` +
              `produced no value for this call.`
          );
        }
        values[name] = resolved;
        continue;
      }

      const param = tool.params.find((p) => p.name === name);
      const value = agentArgs[name];
      if ((value === undefined || value === null) && param?.required !== false) {
        throw new MissingTemplateValueError(
          `Tool "${tool.name}" requires a value for {{${name}}}, but none was supplied.`
        );
      }
      values[name] = value;
    }

    const renderedUrl = renderTemplateString(tool.url, values);
    const renderedQuery = renderRecord(tool.queryParams, values);
    const renderedHeaders = renderRecord(tool.headers, values);
    const renderedBody = tool.body !== undefined ? renderDeep(tool.body, values) : undefined;

    const headers: Record<string, string> = {
      ...(renderedBody !== undefined ? { 'Content-Type': 'application/json' } : {}),
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
