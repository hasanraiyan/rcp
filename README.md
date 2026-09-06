# RCP — REST Connector Protocol

> **Your REST API is already the tool.**

RCP is a lightweight, open protocol for making existing REST APIs **AI-callable and discoverable** without rebuilding your backend around a dedicated protocol server.

**The shortest path from REST to AI.**

[![npm](https://img.shields.io/npm/v/rcp-sdk)](https://www.npmjs.com/package/rcp-sdk)
[![GitHub](https://img.shields.io/github/stars/hasanraiyan/rcp)](https://github.com/hasanraiyan/rcp)

## Turn an existing Express API into AI tools in 5 minutes

```bash
git clone https://github.com/hasanraiyan/rcp.git && cd rcp/examples

cd express && npm install && npm start &        # your REST API + one /rcp/manifest route
cd ../openai-client && npm install               # the AI application side
cp .env.example .env                             # add your OPENAI_API_KEY
npm start -- "List my tasks, then mark the first incomplete one as done."
```

That's a real Express app, a real manifest, and a real OpenAI tool-calling
loop — see [`examples/`](./examples) for both halves in full, plus how to
point the client at your own API instead.

---

## The idea

You already have an API:

```text
GET  /users
GET  /orders
POST /orders
GET  /products
```

Why build another server just so an AI application can use it?

With RCP, your server publishes a simple JSON manifest describing the endpoints that can be exposed as tools.

```text
Existing REST API
       │
       ▼
   RCP Manifest
       │
       ▼
  AI Tool Discovery
       │
       ▼
   Model / Agent
       │
       ▼
 Normal HTTP Request
       │
       ▼
Your existing REST API
```

No backend rewrite.

No JSON-RPC.

No persistent connection.

No new application protocol server.

Just a manifest and normal HTTP.

---

# 🚀 Quick Start

Install the TypeScript reference implementation:

```bash
npm install rcp-sdk
```

Discover tools from an RCP manifest:

```ts
import { createRcpClient } from "rcp-sdk/client";

const client = createRcpClient();

const { tools } = await client.discover("https://api.example.com/rcp/manifest");
```

`tools` is what you hand to your AI application — each one carries an
`exposedParams` list (its declared params, minus anything a resolver already
fills — see "Resolver-Bound Parameters" below).

For example, an API might publish:

```json
{
  "rcpVersion": "0.1",
  "auth": { "type": "none" },
  "tools": [
    {
      "name": "list_orders",
      "description": "List the current user's orders",
      "method": "GET",
      "url": "https://api.example.com/orders",
      "queryParams": { "limit": "{{limit}}" },
      "params": [
        { "name": "limit", "type": "number", "required": false }
      ]
    }
  ]
}
```

The model sees the safe, exposed parameters.

It does **not** see resolver-bound parameters such as `userId` or `tenantId`.

Calling the tool makes the ordinary HTTP request the manifest describes:

```ts
const result = await client.call(tools[0], { limit: 5 });
```

```http
GET /orders?limit=5
```

Want the whole loop — manifest, discovery, and an actual model deciding when
to call a tool? See [`examples/`](./examples) for a full Express server +
OpenAI tool-calling client.

Your existing API handles the request exactly as it normally would.

---

# 🧠 How RCP Works

RCP has two primary roles:

```text
┌─────────────────────┐
│    AI Application   │
│                     │
│  Model / Agent      │
│        │            │
│        ▼            │
│    RCP Client       │
└─────────┬───────────┘
          │
          │ GET manifest
          ▼
┌─────────────────────┐
│     RCP Server      │
│                     │
│  /manifest          │
│                     │
│  Tool definitions   │
└─────────────────────┘
          │
          │
          ▼
   Existing REST API
```

The RCP server does not need to proxy tool execution.

The manifest is simply a **directory of capabilities**.

When the model chooses a tool, the RCP client calls that tool's own URL directly.

```text
Client                         Server
------                         ------

GET /manifest  ────────────►  RCP manifest

                    ◄──────── tool definitions

Model selects tool

GET /orders?limit=5 ───────►  Existing REST endpoint

                    ◄──────── normal HTTP response
```

The manifest URL and tool URLs can even live on different hosts.

---

# 🏗️ Architecture

```mermaid
flowchart LR

    subgraph App["Your AI application"]

        Model["Model / Agent"]

        subgraph RC["RCP Client"]

            Discover["discover()"]

            Call["call()"]

            Auth["Authentication"]

            Resolvers["Resolvers"]

            Headers["Injected headers"]
        end
    end

    Ctx["Application context\nuser / tenant / trace id"]

    Ctx -.-> Resolvers
    Ctx -.-> Headers

    subgraph Server["RCP Server"]

        Manifest["GET /manifest"]

        EndpointA["REST endpoint A"]

        EndpointB["REST endpoint B"]
    end

    Discover -->|"GET manifest"| Manifest

    Manifest -->|"Tool definitions"| Model

    Model -->|"Tool + arguments"| Call

    Auth -.-> Discover
    Auth -.-> Call

    Headers -.-> Discover
    Headers -.-> Call

    Call -->|"HTTP request"| EndpointA
    Call -->|"HTTP request"| EndpointB
```

RCP keeps the architecture deliberately simple:

**Discovery is RCP. Execution is HTTP.**

---

# 🔐 Resolver-Bound Parameters

One of the most important parts of RCP is the distinction between **agent-controlled arguments** and **application-controlled context**.

Consider an endpoint:

```http
GET /orders
```

It may require:

```text
userId
limit
status
```

The model should be allowed to choose:

```text
limit
status
```

But it should not be allowed to choose:

```text
userId
```

RCP handles this through **resolvers**.

```text
                MODEL
                  │
                  │ agent arguments
                  ▼
             ┌─────────┐
             │ RCP     │
             │ Client  │
             └────┬────┘
                  │
          ┌───────┴────────┐
          │                │
          ▼                ▼
     agentArgs          resolvers
          │                │
       limit              userId
       status          ← application
          │                context
          └───────┬────────┘
                  ▼
              HTTP Request
                  │
                  ▼
             REST API
```

A resolver-bound parameter is removed from the model-facing tool schema during discovery.

That means the model cannot:

* see the parameter
* provide the parameter
* override the parameter
* spoof the parameter

The application supplies it from trusted context.

For example:

```ts
{
  userId: (ctx) => ctx.user.id
}
```

The model only sees:

```json
{
  "limit": 5,
  "status": "pending"
}
```

The final request can contain:

```http
GET /orders?userId=123&limit=5&status=pending
```

This makes resolver-bound values useful for:

* `userId`
* `tenantId`
* `organizationId`
* `traceId`
* internal service identifiers
* application context

> **Don't give the model control over what the model shouldn't control.**

---

# 🔄 Request Lifecycle

RCP separates discovery from execution.

```mermaid
sequenceDiagram

    participant M as Model
    participant C as RCP Client
    participant S as RCP Server
    participant API as REST API

    Note over C,S: 1. Discovery

    C->>S: GET manifest
    S-->>C: rcpVersion + tools + auth

    C->>C: Validate manifest
    C->>C: Remove resolver-bound parameters

    C->>M: Expose safe tool schemas

    Note over M,C: 2. Tool selection

    M->>C: Tool + agent arguments

    Note over C: 3. Execution

    C->>C: Resolve trusted parameters
    C->>C: Inject trusted headers
    C->>C: Render URL, query, headers and body

    C->>API: Normal HTTP request

    API-->>C: HTTP response

    C->>C: Apply response mappings

    C->>M: Tool result
```

The important boundary is:

```text
                 Discovery
                    │
                    ▼
        ┌─────────────────────┐
        │ Remove resolver     │
        │ bound parameters    │
        └──────────┬──────────┘
                   │
                   ▼
                 Model
                   │
             safe arguments
                   │
                   ▼
              RCP Client
                   │
       + trusted application context
                   │
                   ▼
              REST API
```

---

# ⚡ Why RCP?

Most APIs are already built around HTTP.

You might already have:

```text
Express
FastAPI
Django
Rails
NestJS
Hono
Go
Rust
.NET
```

And your API already exposes useful capabilities.

RCP doesn't ask you to replace that architecture.

Instead:

```text
Your API
   │
   │ existing endpoints
   ▼
RCP manifest
   │
   ▼
AI application
```

### RCP focuses on one problem:

> **How do I make an existing REST API discoverable and callable by an AI application?**

Nothing more.

That constraint is intentional.

---

# RCP vs MCP

RCP is **not intended to replace MCP**.

They solve different problems.

|                            | RCP          | MCP                     |
| -------------------------- | ------------ | ----------------------- |
| Existing REST API          | ⭐⭐⭐⭐⭐        | Requires integration    |
| Dedicated protocol server  | Not required | Common deployment model |
| Transport                  | HTTP         | Multiple transports     |
| Persistent connection      | No           | Depends on transport    |
| JSON-RPC                   | No           | Yes                     |
| Stateful capabilities      | Limited      | ⭐⭐⭐⭐⭐                   |
| Simple REST integration    | ⭐⭐⭐⭐⭐        | More infrastructure     |
| Rich protocol capabilities | Focused      | ⭐⭐⭐⭐⭐                   |

A useful way to think about it:

```text
Have a complex, stateful integration?

                 ──► MCP

Already have a REST API and want AI access?

                 ──► RCP
```

**RCP is the shortest path from REST to AI.**

---

# 🧩 The Manifest

An RCP manifest describes the tools available to an AI application.

At minimum, it communicates:

```text
RCP version
Authentication
Available tools
Tool parameters
Tool URLs
HTTP methods
```

Conceptually:

```json
{
  "rcpVersion": "0.1",
  "auth": {
    "type": "header"
  },
  "tools": [
    {
      "name": "get_users",
      "description": "Get users",
      "method": "GET",
      "url": "https://api.example.com/users"
    }
  ]
}
```

The manifest is intentionally plain JSON.

There is no requirement for a persistent protocol connection.

---

# 🔑 Authentication

RCP supports authentication declarations so the client knows how requests should be authenticated.

Current protocol concepts include:

```text
none
header
oauth2
```

Authentication credentials remain client/application concerns.

They should never be exposed as model-controlled tool parameters.

> Authentication is part of the trust boundary, not part of the model's tool input.

OAuth2 is specified by the protocol but is not yet implemented by the TypeScript reference client.

---

# 📨 Header Injection

RCP can also inject application-controlled headers.

This is useful for values such as:

```text
Authorization
X-User-ID
X-Tenant-ID
X-Request-ID
X-Trace-ID
```

The application supplies these values through trusted context rather than asking the model to generate them.

---

# 🎯 Response Mappings

RCP can optionally transform an HTTP response before returning it to the model.

This allows an API to return:

```json
{
  "data": {
    "orders": [...]
  },
  "metadata": {
    "total": 25
  }
}
```

while exposing only the useful portion to the model.

For example:

```text
HTTP response
      │
      ▼
responseMappings
      │
      ▼
Tool result
      │
      ▼
Model
```

This keeps the AI-facing result focused without requiring changes to the underlying API.

---

# 🛠️ TypeScript SDK

The TypeScript implementation is currently the **reference implementation** of RCP.

```text
typescript/
├── src/
├── test/
├── README.md
└── package.json
```

Package:

```bash
npm install rcp-sdk
```

`rcp-sdk/client` provides the client-side functionality required to:

* discover RCP manifests
* validate protocol information
* construct AI-facing tools
* resolve application context
* inject headers
* execute REST requests
* apply response mappings

`rcp-sdk/server` provides one helper, `defineTool()`, for building a
manifest tool entry in code from a Zod schema — see
[`examples/express`](./examples/express) for it in use.

---

# 📁 Repository Structure

```text
rcp/
│
├── README.md
├── SPEC.md              # the protocol itself
├── SECURITY.md
├── ROADMAP.md            # what's done vs. designed-only, kept current
├── CONTRIBUTING.md
├── LICENSE
│
├── typescript/           # reference SDK (package `rcp-sdk`)
│   ├── src/
│   ├── test/
│   ├── examples/basic/   # minimal in-package example the SDK's own tests reuse
│   ├── docs/
│   └── package.json
│
├── examples/             # standalone, runnable, install from npm — see examples/README.md
│   ├── express/          # server: a REST API + one route serving an RCP manifest
│   └── openai-client/    # client: discovers a manifest, calls tools via OpenAI tool-calling
│
└── web/                  # rcp.hasanraiyan.me — marketing site + full docs
```

Each language implementation can remain independent while implementing the same protocol and manifest format — a second-language SDK (e.g. `python/`) is an open roadmap item, not yet started.

---

# 🔭 Roadmap

## RCP v0.1

* [x] Manifest format
* [x] Tool discovery
* [x] HTTP execution
* [x] Resolver-bound parameters
* [x] Header injection
* [x] Response mappings
* [x] TypeScript reference SDK
* [x] Basic authentication model
* [ ] OAuth2 reference implementation
* [ ] Playground
* [ ] CLI

## RCP v0.2

* [ ] Python SDK
* [ ] RCP Inspector
* [ ] CLI tooling
* [ ] Conformance tests
* [ ] Improved validation
* [ ] Expanded security specification
* [x] Framework examples — [`examples/express`](./examples/express) +
      [`examples/openai-client`](./examples/openai-client); adapters for
      other agent frameworks tracked in
      [issue #1](https://github.com/hasanraiyan/rcp/issues/1)
* [ ] Better developer tooling

## RCP v1.0

* [ ] Stable specification
* [ ] Multiple independent implementations
* [ ] Conformance suite
* [ ] Security review
* [ ] Versioning guarantees
* [ ] Production ecosystem

The goal is not to rush toward v1.0.

A protocol needs to be **simple, predictable and trustworthy** before it needs to be feature-complete.

---

# 🧪 Status

**RCP v0.1 — Active Design**

RCP is an early-stage protocol and is still evolving.

The specification, SDK APIs and security model may change before v1.0.

See [`ROADMAP.md`](./ROADMAP.md) for the current implementation status, and
[`SPEC.md`](./SPEC.md) for the full protocol design.

---

# 📰 Articles

- [How to Build an AI Agent from Your Existing REST API — Without an MCP Server](https://dev.to/raiyan_hasan_857d2fb07211/how-to-build-an-ai-agent-from-your-existing-rest-api-without-an-mcp-server-3f3c) — 5-min walkthrough: `defineTool()` → `GET /manifest` → `rcp-sdk` adapters for OpenAI / LangChain / Gemini (canonical: https://rcp.hasanraiyan.me/docs/getting-started)
- [Stop Your AI Agent From Leaking Tenant Data — Params the Model Never Sees](https://dev.to/raiyan_hasan_857d2fb07211/stop-your-ai-agent-from-leaking-tenant-data-params-the-model-never-sees-1fjo) — Secure multi-tenant isolation via resolver-bound params — stop prompt injection from stealing another tenant's data (canonical: https://rcp.hasanraiyan.me/docs/guides/secure-tenant-isolation)

---

# 🤝 Contributing

RCP is being developed as an open protocol. See [`CONTRIBUTING.md`](./CONTRIBUTING.md)
for repo layout and how to run each package's checks.

Contributions are welcome, especially around:

* protocol design
* security
* SDK implementations
* framework integrations
* examples
* documentation
* interoperability testing

If you're building something with RCP, opening an issue or discussion is a great way to share it.
Found a vulnerability instead? See [`SECURITY.md`](./SECURITY.md).

---

# 📜 License

See [`LICENSE`](./LICENSE).

---

# The simplest way to remember RCP

```text
             REST API
                 │
                 │
          RCP Manifest
                 │
                 ▼
          AI Tool Discovery
                 │
                 ▼
             AI Agent
                 │
                 ▼
          Normal HTTP Call
                 │
                 ▼
             REST API
```

**Your REST API is already the tool.**

### RCP — The shortest path from REST to AI.
