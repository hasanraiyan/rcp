# `@rcp/sdk/client`

For whoever is building the AI application — the RCP **client** role. Discovers a server's
manifest, exposes its tools, and executes calls against them.

```ts
import { createRcpClient } from '@rcp/sdk/client';
```

## `createRcpClient(options?)`

Creates one client bound to a single server's auth/resolver/header configuration. Registering a
second server means calling `createRcpClient()` again with different config — there's no
multi-server registry inside one instance.

```ts
const client = createRcpClient({
  auth: { type: 'header', secret: process.env.SERVER_TOKEN! },
  resolvers: {
    userId: (ctx) => ctx.currentUserId,
  },
  headers: {
    'X-Request-Id': () => crypto.randomUUID(),
  },
});
```

### Options

| Option | Type | Notes |
|---|---|---|
| `auth` | `{ type: 'none' } \| { type: 'header'; header?: string; scheme?: string; secret: string } \| { type: 'oauth2' }` | How this client authenticates to the server. Defaults to `{ type: 'none' }`. **`oauth2` throws immediately at `createRcpClient()`** — the protocol supports it, but this version doesn't implement the OAuth flow yet; use `'none'` or `'header'`. |
| `resolvers` | `Record<string, (ctx: unknown) => unknown>` | Param name → resolver function. A param with a registered resolver is (a) removed from `exposedParams` at discovery time and (b) filled from the resolver — never from `agentArgs` — at call time. |
| `headers` | `Record<string, (ctx: unknown) => string>` | Header name → value function. Attached to every outgoing request (manifest fetch and every tool call), independent of anything the manifest declares. |
| `logger` | `{ info, warn, error }` (each `(message: string) => void`) | Structural logging only — see "Logging" below. Silent (no-op) by default; pass `console` to see it, or your own logger. |

## Logging

Pass `logger: console` (or any object with `info`/`warn`/`error`) to see what the client is doing:

```ts
const client = createRcpClient({ logger: console });

await client.discover('https://example.com/rcp/manifest');
// info: [RCP] discover: GET https://example.com/rcp/manifest
// info: [RCP] discover: found 2 tool(s) at ... (auth: header): get_weather, search
// info: [RCP] discover: "get_weather" hides 1 resolver-bound param(s) from the model: city
```

This is also how you find out what a server is asking for before you've configured anything —
`discover()` always logs each tool's resolver-hidden params, so you can see at setup time which
ones you might be missing a resolver for. For structured/programmatic access to the same
information, use [`describeManifest()`](#describemanifest) instead of parsing log lines.

**What's never logged**: header values, request/response bodies, resolved values (including
whatever a resolver returns), or the auth secret. Only structural facts — tool names, HTTP
methods, status codes, and param *names* — ever reach the logger.

## `describeManifest(manifest, tools)`

Formats a `discover()` result into a human-readable string — the programmatic way to see what a
server is asking for, without reading logs:

```ts
import { createRcpClient, describeManifest } from '@rcp/sdk/client';

const client = createRcpClient({ resolvers: { userId: (ctx) => ctx.currentUserId } });
const { manifest, tools } = await client.discover('https://example.com/rcp/manifest');

console.log(describeManifest(manifest, tools));
// RCP manifest v0.1 — auth: header "Authorization" (scheme: Bearer)
// 1 tool(s):
//   - get_profile (GET) — Get the current user's profile.
//       userId: string, required [resolved by client, hidden from model] — the user's id
```

Useful the first time you register a new server: run `discover()`, print
`describeManifest(manifest, tools)`, and decide which params need a resolver before wiring the
server into a live agent.

`ctx` is whatever your own application passes to `discover()`/`call()` — the SDK never defines its
shape. Typically it's per-request context your host already has (the current user, tenant, trace
id, etc.).

## `client.discover(url, ctx?)`

Fetches, validates, and returns a server's manifest.

```ts
const { manifest, tools } = await client.discover('https://example.com/rcp/manifest');
```

Returns `{ manifest: RcpManifest, tools: DiscoveredTool[] }`. Each `DiscoveredTool` is the raw
`RcpTool` plus `exposedParams` — the same `params` array with every resolver-bound name removed.
**Show `exposedParams`, not `params`, to your model** — that's the whole point of a resolver.

Throws:

| Error | When |
|---|---|
| `Error` (plain) | The manifest URL returned a non-2xx status. |
| `RcpManifestValidationError` | The response body doesn't match the manifest schema. |
| `RcpVersionMismatchError` | `rcpVersion` in the response isn't one this client supports. |

## `client.call(tool, agentArgs?, ctx?)`

Executes one tool call: renders every `{{token}}` in the tool's `url`/`queryParams`/`headers`/
`body`, resolving each from a registered resolver (if any) or from `agentArgs` (what your model
supplied), attaches auth + injected headers, makes the HTTP request, and applies the tool's
`responseMappings`.

```ts
const result = await client.call(tool, { city: 'Paris' }, { currentUserId: 'u_42' });
// { status: 200, ok: true, raw: {...}, mapped: {...} }
```

Pass the *raw* tool object (from `discover()`'s `tools` array, or wherever else you got an
`RcpTool`) — not just the ids in `exposedParams`; `call()` needs the full `params` list to know
which tokens are resolver-bound versus model-fillable.

Throws:

| Error | When |
|---|---|
| `MissingTemplateValueError` | A required, non-resolver-bound token has no value in `agentArgs`. |
| `RcpResolverError` | A registered resolver ran but returned `null`/`undefined`. |
| `RcpToolAuthOverrideNotImplementedError` | The tool declares its own `auth`, overriding the client's — not implemented in this version; register the tool via a separate `createRcpClient()` instance with the right auth instead. |

None of these retry or swallow the problem — a call that can't be safely made throws before any
HTTP request goes out, rather than sending a request with a missing, empty, or spoofed value.

## Error classes

All exported from `@rcp/sdk/client`, all plain `Error` subclasses (safe to `instanceof`-check):
`RcpAuthNotImplementedError`, `RcpVersionMismatchError`, `RcpManifestValidationError`,
`RcpResolverError`, `RcpToolAuthOverrideNotImplementedError`, `MissingTemplateValueError`.
