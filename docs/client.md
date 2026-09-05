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
| `auth` | `{ type: 'none' } \| { type: 'header'; header?: string; scheme?: string; secret: string } \| { type: 'oauth2' }` | How this client authenticates to the server. Defaults to `{ type: 'none' }`. **`oauth2` throws immediately** — not implemented in this version (see RCP_SPEC.md's "Implementation phasing"). |
| `resolvers` | `Record<string, (ctx: unknown) => unknown>` | Param name → resolver function. A param with a registered resolver is (a) removed from `exposedParams` at discovery time and (b) filled from the resolver — never from `agentArgs` — at call time. |
| `headers` | `Record<string, (ctx: unknown) => string>` | Header name → value function. Attached to every outgoing request (manifest fetch and every tool call), independent of anything the manifest declares. |

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

Neither error type retries or swallows — a call that can't be safely made throws before any HTTP
request goes out, per RCP_SPEC.md's resolver-failure posture.

## Error classes

All exported from `@rcp/sdk/client`, all plain `Error` subclasses (safe to `instanceof`-check):
`RcpAuthNotImplementedError`, `RcpVersionMismatchError`, `RcpManifestValidationError`,
`RcpResolverError`, `RcpToolAuthOverrideNotImplementedError`.
