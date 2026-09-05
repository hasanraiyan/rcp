# RCP — REST Connector Protocol

**Status:** v0.1 draft. Not finalized, not yet implemented. This is the starting point for
discussion, not a committed spec.

**Implementation phasing:** the spec documents all three `auth` modes (§Auth), but the first
implementation only needs to actually build `none` and `header` (a plain static token) — those
cover the common cases. `oauth2` stays fully specified so the wire format never has to change to
add it, but building it is deliberately deferred past v1.

## The one-line pitch

MCP for the case where you already just have a REST API and don't want to run a protocol server
to expose it — a server publishes a plain JSON manifest at a URL; any client fetches it, builds
tools from it, and calls the endpoints it describes directly. No JSON-RPC, no persistent
connection, no SDK required on the server side at all (a server can be a single static JSON file).

## Why not just use MCP

MCP is the right answer when you want rich, stateful capabilities — resources a user browses,
prompts a user picks, elicitation/sampling mid-call, a long-lived connection. That power has a
cost: implementing an MCP server means implementing JSON-RPC, a transport (stdio or Streamable
HTTP), and the base protocol's negotiation flow, even if all you actually have is "call this REST
endpoint with this shape."

RCP is deliberately *not* trying to be MCP-but-open-source. It's for the much narrower, much more
common case: **"I have a REST API. I want an AI application to be able to call some of its
endpoints as tools, and I don't want to run anything besides my existing API plus one more route
that returns JSON."** If you outgrow that — you want the AI to browse resources, present prompt
templates, ask the user something mid-call — that's a real signal to reach for MCP instead, not a
gap RCP tries to fill.

## Design principles

1. **Zero protocol library on the server side.** A conformant server can be `curl`-tested — there's
   no handshake, no persistent socket, no client library required to *implement* one. A static
   JSON file behind a CDN is a valid, fully conformant RCP server.
2. **Discovery and execution are different requests to different places.** Fetching the manifest
   only ever tells the client *what exists*. Running a tool means the client makes an ordinary HTTP
   request straight to that tool's own declared URL — which can be a completely different domain
   than the manifest itself. The manifest endpoint is a directory, not a proxy.
3. **The client is the trust boundary**, same principle MCP states explicitly. A server's manifest
   is untrusted input until the client's operator has explicitly registered that server — same
   posture as MCP toward tool descriptions from an unverified MCP server.
4. **Secrets never appear in the manifest, and never reach the model.** A tool declares that it
   *needs* auth and how (§Auth); the actual secret value lives only in the client's own secret
   store, resolved at execution time, never serialized into anything the model or the wire
   protocol between client and server ever carries in plaintext.
5. **No persistence requirement on the client either.** A client is allowed to treat a fetched
   manifest as fully ephemeral — re-fetch it on every use — so a server's tool list can change
   between one call and the next with no "sync" step anywhere. Clients *may* cache with a TTL for
   performance; nothing in the protocol depends on them doing so.

## Architecture

RCP has exactly two roles — **Client** and **Server** — not the three-way Host/Client/Server split
MCP uses, because there's no persistent per-server connection to hold open; a client talks to as
many servers as it wants, each interaction a plain stateless request:

- **Client** — the AI application. Registers servers (URL + how to authenticate to it), fetches
  their manifests, presents the tools they describe to a model, executes the ones the model calls.
- **Server** — anything that answers `GET <manifest-url>` with a conformant manifest document. Has
  no obligation beyond that one endpoint; the tool endpoints the manifest *describes* can be the
  same server or entirely separate ones.

```
   Client                             Server
   ------                             ------
   GET  <manifest-url>          -->  200 { "rcpVersion": "0.1", "tools": [...] }
   (builds callable tools from the manifest)
   ...model picks a tool...
   <method> <tool's own url>    -->  (whatever that endpoint normally returns)
```

That's the entire wire protocol. There is no other message type.

## The manifest

`GET <manifest-url>` returns:

```json
{
  "rcpVersion": "0.1",
  "auth": { "type": "none" },
  "tools": [
    {
      "name": "get_learner_profile",
      "description": "Fetches a learner's plan and progress by id.",
      "method": "GET",
      "url": "https://api.example.com/learners/{{learnerId}}/profile",
      "params": [
        { "name": "learnerId", "type": "string", "description": "The learner's id" }
      ],
      "responseMappings": { "name": "@data.name", "progress": "@data.progress.percent" }
    },
    {
      "name": "search_courses",
      "description": "Searches the course catalog by free-text query.",
      "method": "GET",
      "url": "https://api.example.com/courses/search",
      "queryParams": { "q": "{{query}}" },
      "params": [
        { "name": "query", "type": "string", "description": "Free-text search term", "required": true }
      ]
    }
  ]
}
```

Each tool entry:

| Field | Required | Notes |
|---|---|---|
| `name` | yes | Unique within this manifest. A client namespaces it against other servers, not this spec's job. |
| `description` | yes | What the model sees when deciding whether to call it. |
| `method` | yes | `GET \| POST \| PUT \| PATCH \| DELETE` |
| `url` | yes | May contain `{{token}}` placeholders — see `params`. |
| `params` | no | Declares each `{{token}}` used anywhere in `url`/`queryParams`/`headers`/`body`: `{name, type, description, required}`. Purely descriptive for the model — see §Resolvers for how a client may intercept one instead of asking the model. |
| `queryParams` / `headers` | no | `{{token}}`-templated maps, same substitution rules as `url`. |
| `body` | no | A JSON template; presence implies the request has a JSON body. |
| `auth` | no | Overrides the server-level `auth` (§Auth) for this one tool only. Omitted = inherits the server's auth. |
| `responseMappings` | no | `{ fieldName: "@json.path" }` — reshapes the tool endpoint's response before it reaches the model. Omitted = raw response passed through. |

## Resolvers — a client-side capability, not a wire concept

A tool often needs a value that shouldn't come from the model at all: which end-user is asking,
which tenant they belong to, a locale, anything the *client's own operator* already knows and the
model would otherwise have to guess or could spoof. MCP has no answer for this — `inputSchema` is
plain JSON Schema, every property in it is something the client is expected to let the model fill
(confirmed against the spec: the closest thing, `x-mcp-header`, still shows the param to the model
and is explicitly documented as unsafe for exactly this purpose). RCP's answer is to keep the wire
format untouched and put the mechanism entirely on the client side instead.

**Nothing is declared in the manifest.** A param like `learnerId` above is written exactly like
any other model-fillable param — the server doesn't tag it, doesn't need a reserved name, and
doesn't need to know or care whether some client intercepts it.

**A conformant client implementation provides a resolver registry** — a place its own operator
(the developer who registered this server) configures, outside the manifest entirely: "for this
server, the param named `learnerId` isn't asked of the model — resolve it with this function
instead," where that function reads from whatever the client already knows about the current
caller (its own auth/session layer). This is a capability the *client's SDK* exposes, not
something RCP serializes onto the wire — general-purpose, not limited to one hardcoded param name
or purpose.

At tool-schema-build time, the client removes every param it has a registered resolver for before
showing the tool to the model — structurally unfillable, not just discouraged. At execution time,
it calls the resolver to get the real value and substitutes it into the request, exactly like any
other param, before the server ever sees it. A resolver with nothing to resolve from (no verified
caller behind this particular turn, say) fails the call before any HTTP request goes out, rather
than sending an empty or model-supplied stand-in.

This is deliberately general-purpose — the exact same mechanism covers end-user identity, a tenant
id, a region, or anything else an operator wants auto-filled, with no protocol change needed to add
a new kind. The trade-off, stated plainly: since nothing is self-describing on the wire, a client
that never configures a resolver for a given server will just show that param to the model as an
ordinary fillable argument — there's no protocol-level signal warning the operator "you probably
want to intercept this one." A server's `description` on a param like `learnerId` is the only hint
a client operator gets; RCP relies on that being written clearly rather than enforcing anything.

## Auth

One declaration, at the top level of the manifest (`auth`), secures **both** the manifest fetch
itself and every tool call made from it by default — one server, one auth story, exactly like an
MCP server secures its whole JSON-RPC connection rather than authenticating each method call
differently. A tool may set its own `auth` to override this (needed when a tool's `url` points at
a different domain than the manifest, e.g. a third-party API), but the common case declares it
once.

Three modes, deliberately the same three tiers MCP itself supports:

### `{ "type": "none" }`

No auth. The manifest is fetched with a plain `GET`, tool calls carry no injected `Authorization`.

### `{ "type": "header", "header": "Authorization", "scheme": "Bearer" }`

A static shared secret, attached as `<header>: <scheme> <secret>` (or just `<header>: <secret>` if
`scheme` is omitted). The manifest never contains the secret itself — it declares the *shape*
(which header, which scheme); the literal value is something the client operator configures when
they register this server, out of band, the same way registering an MCP server's API key
typically works. This is the equivalent of MCP's simplest deployments that just check a static
bearer token.

### `{ "type": "oauth2", "resource": "https://api.example.com" }`

Full OAuth 2.1, specified as **the same RFC set MCP's own authorization spec already uses** —
deliberately, so a client that already speaks MCP's OAuth flow needs no new auth logic to also
speak RCP's:

1. Client makes an unauthenticated request (manifest fetch, or a tool call). Server replies `401`
   with `WWW-Authenticate: Bearer resource_metadata="<url>"`, pointing at its OAuth 2.0 Protected
   Resource Metadata document (RFC 9728).
2. Client fetches that metadata, which names the Authorization Server(s) for this resource.
3. Client fetches that Authorization Server's metadata (RFC 8414,
   `<issuer>/.well-known/oauth-authorization-server`) to find its endpoints.
4. If the client isn't already registered with this Authorization Server, it registers itself via
   Dynamic Client Registration (RFC 7591) — a one-time step, cacheable per Authorization Server.
5. Client runs the Authorization Code flow with PKCE (RFC 7636), passing the manifest's `resource`
   value as the `resource` parameter (RFC 8707, Resource Indicators) so the resulting token is
   scoped to *this* server specifically and can't be replayed against a different one.
6. Client attaches `Authorization: Bearer <access_token>` to the manifest fetch and every tool
   call, refreshing via the refresh token when it expires. Caching this token across calls is the
   one piece of state a client is expected to keep — purely a performance optimization, not
   something the protocol depends on (a client that re-ran the whole flow every single call would
   still be conformant, just slow).

A client that already implements MCP's own OAuth flow (Dynamic Client Registration, PKCE,
endpoint discovery) needs no new logic to also support RCP's `oauth2` mode — only a different
discovery trigger (a `401` + `WWW-Authenticate`, rather than MCP's own handshake).

## Client-injected headers — beyond resolvers

Resolvers (§above) fill in a value for a `{{token}}` the manifest already declares. Separately, a
client is free to attach headers to any outgoing request — manifest fetch or tool call — that
**don't correspond to any declared param at all**. Nothing in RCP needs to enumerate these, because
every RCP request is a plain HTTP request and adding a header is something any HTTP client can
always do; it's worth calling out explicitly so implementers don't assume the manifest's
`headers`/`params` fields are the only source of what goes out on the wire. Typical examples:

- A correlation/request id, for the client's own tracing.
- `X-RCP-Version: 0.1` — a transport-level echo of the manifest's `rcpVersion`, letting a server
  (or anything in front of it — a gateway, a WAF) branch on protocol version without parsing a
  response body. Recommended on every client request, complementing (not replacing) `rcpVersion`
  in the manifest body, which stays the authoritative version signal.
- Whatever the chosen `auth` mode requires (`Authorization` for `header`/`oauth2`).

A server **MUST** ignore headers it doesn't recognize rather than rejecting the request — the
usual "be liberal in what you accept" posture, since a client is always free to add more of these
later without that being a breaking change for any server.

## Reference SDK — what it would provide

Everything above (`auth`, resolvers, client-injected headers) is a set of *behaviors* a conformant
client must implement — nothing requires a shared library to exist. But without one, every client
ends up hand-rolling the same discovery-fetch-template-inject logic on its own. A reference RCP
client SDK's whole value is turning that into shared, declarative config instead of per-client
bespoke code:

```ts
const rcpClient = createRcpClient({
  auth: { type: 'header', header: 'Authorization', scheme: 'Bearer', secret: /* client-held value */ },

  // fills a declared {{token}} param before the model ever sees the tool's
  // schema — the model has no argument to fill for anything named here
  resolvers: {
    learnerId: (ctx) => ctx.currentUserId,
  },

  // attached to every outgoing request (manifest fetch + every tool call),
  // independent of anything the manifest declares
  headers: {
    'X-Client-User-Id': (ctx) => ctx.currentUserId,
    'X-RCP-Version': () => '0.1',
  },
});

const tools = await rcpClient.discover(serverUrl);        // fetch + validate the manifest
const result = await rcpClient.call(tool, agentArgs, ctx); // resolvers + headers + auth applied, then the HTTP call
```

`ctx` here is deliberately client-shaped, not RCP-shaped — the SDK doesn't define what a "context"
looks like, only that resolver/header functions receive whatever the client already has on hand
for the current call. This is the one place the SDK has to stay generic rather than opinionated:
it standardizes *how* a value gets attached to a request, never *where a client's own identity
data comes from*.

Once an SDK like this exists, any client implementation can adopt these behaviors as configuration
rather than re-deriving this design from scratch — and any server just needs to serve a valid
manifest, with no SDK dependency of its own at all.

## Fitting into an agent framework

Most agent frameworks reduce to: a flat list of callable tools handed to the model, plus — in some
frameworks — a separate mechanism for longer-form instructions or "skills" that aren't invoked as
function calls. RCP only needs to plug into the first half: a client resolves a manifest's tools
into whatever tool representation its framework expects (typically a JSON-Schema-based
function-calling tool) and adds them to that same flat list. A framework doesn't need to know or
care that a given tool came from an RCP server rather than a hand-built one.

**Tools** — because of this, a client's own tool-resolution layer is typically a non-issue: RCP's
`.discover()`/`.call()` slot into whatever aggregation step a framework already has for combining
tools from multiple sources.

**Skills / instructions** — RCP v0.1 deliberately has no equivalent of a framework's separate
"skills"/instructions concept (§What's explicitly out of scope) — the same posture MCP itself
takes, where an equivalent extension ("Skills over MCP") is opt-in and separate from core Tools,
not part of it. If real demand shows up, the natural shape would be a manifest-level `skills`
array (parallel to `tools`, same discovery model) that a client mounts wherever its framework
expects instructional content to live.

**Sub-agents** — a framework that gives sub-agents their own tool subset drawn from a shared pool
needs no RCP-specific work once RCP tools are in that pool.

**A future Resources-like primitive** (also out of scope for v0.1) would plug in wherever a
framework mounts file-like/resource content, not through the tool-calling mechanism — worth
remembering if/when Resources gets revisited.

## Versioning

`rcpVersion` is a plain string on every manifest response. A client that receives a manifest with
a `rcpVersion` it doesn't understand should refuse to load that server's tools rather than guess —
same "explicit over implicit" posture as MCP's capability negotiation.

## Security & trust (adapted from MCP's stated principles)

1. **Registration is consent.** A client must not fetch or execute anything from a server the
   client's *operator* didn't explicitly register — no automatic discovery of arbitrary URLs.
2. **Tool descriptions are untrusted content** from an unverified server, exactly as MCP treats
   server-supplied tool metadata — a client UI that lets an operator review a manifest before
   attaching it to a live agent is the mitigation, not a protocol-level guarantee.
3. **Secrets are client-side only.** Whether `header` or `oauth2`, the literal secret/token value
   is something the client resolves itself (from its own config, or its own OAuth token cache) —
   never something a manifest or a tool response carries or that the model ever sees. A manifest
   declares only the *shape* of auth required, never a credential.
4. **A server can't see client-side conversation state.** The manifest fetch and each tool
   execution are ordinary stateless HTTP requests — nothing about the surrounding conversation is
   ever sent to a server beyond what a specific tool call's own params/body explicitly carry.

## What's explicitly out of scope for v0.1

- Resources, Prompts, Sampling, Elicitation, Roots — all MCP concepts with no RCP equivalent yet.
  If real demand shows up for any of these, they'd be additive, opt-in extensions layered on top
  of the same manifest+HTTP model, not a rewrite of it.
- A bidirectional/streaming transport. Every RCP interaction is a plain request/response over
  HTTPS; there is no long-lived connection, no server-push.
- A server-side SDK requirement. Reference SDKs (a manifest-builder helper) are useful ergonomics,
  not a conformance requirement — the spec is fully defined by "does `GET <manifest-url>` return
  valid JSON matching the schema above."

## Open questions for discussion

- Should `rcpVersion` be part of the manifest body (as drafted) or an HTTP header, so a client can
  reject an incompatible version without parsing the body at all?
- Should a call to a tool with an unresolvable registered resolver fail the whole turn, or just
  make that one tool silently unavailable for turns with no verified caller (mirroring how an
  unreachable server is already handled)? Worth deciding as part of the spec's own recommended
  default, rather than leaving it entirely to each client implementation.
- Should the spec recommend (not require) a naming convention for commonly-resolved params — e.g.
  servers document their identity param as `identity` or `userId` by convention — purely so client
  operators configuring a new server have less guesswork, given the wire format itself carries no
  signal at all now?
- Does a server ever need to *push* a manifest-changed notification, or is "clients may re-fetch
  whenever they want, with whatever cache policy they want" sufficient forever? (MCP's answer for
  its own list-changed case is a `notifications/tools/list_changed` push — RCP has no transport to
  carry that even if we wanted it, given principle 5.)
- Reference SDK languages/priority — presumably TypeScript first, but worth deciding whether a
  second language matters for "open protocol" credibility the way MCP's own multi-language SDKs
  did.
