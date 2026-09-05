# RCP — REST Connector Protocol

A lightweight, open protocol for exposing REST APIs as AI-callable tools — without running a
protocol server. If MCP is the right fit when you need rich, stateful capabilities, RCP is for the
much more common case: you already have a REST API, and you just want an AI application to be able
to call some of its endpoints as tools.

## The shape of it

A **server** publishes a plain JSON manifest at a URL. A **client** fetches it, builds callable
tools from it, and calls the endpoints it describes directly — no JSON-RPC, no persistent
connection.

```
Client                             Server
------                             ------
GET  <manifest-url>          -->  200 { "rcpVersion": "0.1", "tools": [...] }
...model picks a tool...
<method> <tool's own url>    -->  (whatever that endpoint normally returns)
```

## Architecture

Two roles, no third "host" layer, no persistent connection — every interaction is a plain,
stateless HTTP request:

```mermaid
flowchart LR
    subgraph App["Your AI application"]
        Model["Model / Agent"]
        subgraph RC["RCP Client"]
            Discover["discover()"]
            Call["call()"]
            Auth["auth\n(none / header / oauth2*)"]
            Resolvers["resolvers\nparam name → value(ctx)"]
            Headers["injected headers\nheader name → value(ctx)"]
        end
    end

    Ctx["ctx\n(current user, tenant, trace id, ...)"] -. provides .-> Resolvers
    Ctx -. provides .-> Headers

    subgraph Srv["RCP Server"]
        Manifest["GET /manifest\nreturns rcpVersion, auth, tools"]
        Endpoint1["tool endpoint A"]
        Endpoint2["tool endpoint B"]
    end

    Discover -- "GET manifest\n+ auth + headers" --> Manifest
    Manifest -- "tool list (exposedParams only)" --> Model
    Model -- "tool name + agentArgs" --> Call
    Auth -. attaches to .-> Discover
    Auth -. attaches to .-> Call
    Headers -. attaches to .-> Discover
    Headers -. attaches to .-> Call
    Call -- "method + url\n(+ auth + headers)" --> Endpoint1
    Call -- "method + url\n(+ auth + headers)" --> Endpoint2
```

*`oauth2` is fully specified in the protocol but not yet implemented by the reference client — see
`typescript/README.md`'s Status section.*

The key architectural point resolvers exist to enforce: **a resolver-bound param never reaches the
model** — it's removed from the tool schema at discovery time, not just hidden by convention. The
sequence below shows exactly where that happens relative to everything else:

```mermaid
sequenceDiagram
    participant M as Model (LLM)
    participant C as RCP Client
    participant S as RCP Server

    Note over C,S: 1. Discovery — once per session (or whenever you choose to re-fetch)
    C->>S: GET manifest URL (+ auth, + injected headers)
    S-->>C: 200 OK — rcpVersion, auth, and the tool list
    C->>C: Validate against schema, check rcpVersion
    C->>C: Strip resolver-bound params → exposedParams

    Note over C,M: 2. Tool selection
    C->>M: Present tools (exposedParams only — resolver-bound ones invisible)
    M->>C: Pick a tool + arguments for exposedParams

    Note over C,S: 3. Execution — every tool call
    C->>C: Resolver-bound params ← resolvers[name](ctx)
    C->>C: Everything else ← agentArgs (what the model supplied)
    C->>C: Render every {{token}} in url/queryParams/headers/body
    C->>S: HTTP request to the tool's own URL (+ auth, + injected headers)
    S-->>C: raw HTTP response
    C->>C: Apply responseMappings
    C->>M: mapped result
```

Two things worth noticing in that diagram: **discovery and execution hit different places** (the
manifest URL is only ever a directory — the model's tool call goes straight to the tool's own
`url`, which can be an entirely different host), and **resolver values are computed after the model
has already picked a tool** — the model never had the option to supply them, spoof them, or even
see that they exist.

## SDKs

Each language implementation lives in its own top-level folder — same protocol, same manifest
shape, independent tooling/build/versioning per language:

- [`typescript/`](./typescript) — `rcp-sdk`, the reference implementation. Start here.

More languages may be added the same way later (e.g. a `python/` folder), each self-contained with
its own package manifest, tests, and docs.

## Status

v0.1, in active design. See [`ROADMAP.md`](./ROADMAP.md) for the full done/not-done checklist
across the protocol design and the reference SDK.
