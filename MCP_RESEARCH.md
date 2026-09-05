# MCP research notes

Sourced from the official spec at [modelcontextprotocol.io](https://modelcontextprotocol.io),
current revision **2026-07-28** (fetched 2026-09-05). This revision is a significant rework from
the earlier 2024-11-05 / 2025-03-26 versions our own `agent-backend` MCP integration was built
against — worth knowing before comparing "RCP" against it.

## What it is, one line

An open, JSON-RPC-based standard so an AI application (a "host") can plug into external
tools/data/prompts through a common protocol instead of a bespoke integration per data source —
pitched as "USB-C for AI applications."

## Architecture: Host → Client → Server

- **Host** — the AI application itself (e.g. Claude Desktop, an IDE). Creates and manages
  multiple **clients**, enforces security/consent policy, coordinates the actual LLM calls, holds
  the full conversation (servers never see it).
- **Client** — one per server, 1:1. Lives inside the host, attaches protocol version +
  capabilities to every request, routes messages, manages subscriptions.
- **Server** — the integration itself. Exposes resources/tools/prompts, stays isolated from other
  servers and from the full conversation, can be a local process (stdio) or a remote service
  (HTTP).

Explicit design principles worth noting: servers should be trivially easy to build, highly
composable, and structurally unable to see the whole conversation or into other servers — the
*host* is the trust boundary, not the server.

## Base protocol — now stateless (the big 2026-07-28 change)

Earlier MCP had a session: an `initialize` handshake established a `Mcp-Session-Id`, and
subsequent requests relied on that saved server-side state. **2026-07-28 removes this entirely.**
Every request is now self-contained — it carries its own protocol version and capabilities in
`_meta.io.modelcontextprotocol/clientCapabilities` — so any server instance behind an ordinary
load balancer can answer any request. No sticky sessions, no server-side connection state.

- **Discovery**: an optional `server/discover` call up front returns supported versions +
  capabilities, before committing to anything.
- **Multi Round-Trip Requests (MRTR)**: when a server needs input mid-call (a sampling completion,
  an elicited value, previously a `roots/list`), it replies with an `InputRequiredResult`
  instead of a final result. The client resolves the input and **retries the original request**
  with `inputResponses` attached — a generic mechanism now backing what used to be three separate
  bespoke protocol features (sampling, elicitation, roots).
- **Header-based routing**, **cacheable list results**, and **authorization hardening** round out
  the stateless rework — all aimed at making MCP scale on plain HTTP infra rather than requiring
  sticky/stateful server processes.

## The primitives

**Server → client (what a server exposes):**
| Primitive | What it is |
|---|---|
| Tools | Functions the AI model can invoke |
| Resources | Context/data for the user or model to read |
| Prompts | Templated messages/workflows for users |

**Client → server (what a client can be asked for), all now via the MRTR/`InputRequiredResult` pattern:**
| Primitive | Status | What it is |
|---|---|---|
| Elicitation | Core | Server asks the user (via the host) for more information mid-call |
| Sampling | Core, re-architected | Server asks the client to run an LLM completion (`sampling/createMessage`) — still alive, just no longer its own bespoke flow, riding the generic MRTR mechanism instead |
| Roots | **Deprecated** (SEP-2577, 12-month sunset clock started 2026-07-28) | Client tells a server which filesystem directories are "relevant." Never an access-control mechanism, just guidance. New implementations should pass paths via tool params/resource URIs instead |

**Utilities**: progress tracking, cancellation, structured error reporting, config.

## Extensions framework — opt-in, negotiated per-connection

Beyond the core protocol, MCP now has a formal extensions mechanism: always opt-in, both sides
must declare support during discovery/initialization. Notable current extensions:

- **Tasks** — async execution of long-running operations: polling, mid-flight input, durable
  handles (for work that outlives a single request/response).
- **Skills over MCP** — structured, discoverable instructions for agent workflows (conceptually
  close to what "Skills" already mean in our own product).
- **MCP Apps** (SEP-1865) — servers declare a UI template ahead of time; the host renders it as a
  sandboxed iframe; the rendered UI talks back to the host over JSON-RPC. This is the closest MCP
  analog to what we've been calling "MCP App widgets" in `agent-backend`.

## Security model (protocol-level principles, not enforced by the protocol itself)

1. **User consent and control** — explicit consent for all data access/actions, users can review
   and revoke.
2. **Data privacy** — hosts must not forward resource data anywhere without consent.
3. **Tool safety** — tool descriptions/annotations are **untrusted input** unless the server itself
   is trusted; hosts must get explicit consent before invoking any tool.

The spec is explicit that it *cannot enforce* these at the protocol layer — it's a set of MUST/SHOULD
requirements on implementors (hosts in particular), not a technical guarantee.

## Where our own MCP integration sits relative to this

`agent-backend/src/modules/mcp/` (`mcp.model.js`, `mcp.service.js`, `mcp-oauth-client.js`) was built
against the pre-stateless spec: session-based OAuth (owner/user modes, PKCE, Dynamic Client
Registration), `http`/`sse` transports, and it calls `tools/list`/`callTool` fresh on every agent
turn already (see `mcp.tools.js#resolveMcpTools`) — which happens to already match the *spirit* of
the new stateless model (no cached tool state trusted across turns) even though it predates the
2026-07-28 revision's formal statelessness. Sampling/Roots/Elicitation are not implemented on our
client side at all currently — our "clients" (Agents) only ever consume tools/resources, never
answer a server-initiated MRTR input request.

## Sources

- [Introduction](https://modelcontextprotocol.io/introduction)
- [Specification overview, 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28)
- [Architecture, 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/architecture)
- [Roots (deprecated), 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/client/roots)
- [The 2026-07-28 Specification — MCP blog](https://blog.modelcontextprotocol.io/posts/2026-07-28/)
- [The New MCP Roadmap — MCP blog](https://blog.modelcontextprotocol.io/posts/mcp-roadmap/)
