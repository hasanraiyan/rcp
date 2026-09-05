# RCP — REST Connector Protocol

A lightweight, open protocol for exposing REST APIs as AI-callable tools — without running a
protocol server. If MCP is the right fit when you need rich, stateful capabilities, RCP is for the
much more common case: you already have a REST API, and you just want an AI application to be
able to call some of its endpoints as tools.

Full design: [`RCP_SPEC.md`](./RCP_SPEC.md). Background research on MCP that informed this design:
[`MCP_RESEARCH.md`](./MCP_RESEARCH.md).

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

## This package

`@rcp/sdk` ships two entry points:

```ts
// Building the AI application? Import the client.
import { createRcpClient } from '@rcp/sdk/client';

// Exposing your own REST endpoints as tools? Import the server helper.
import { defineTool } from '@rcp/sdk/server';
```

See [`examples/basic`](./examples/basic) for a minimal end-to-end example: a tiny server exposing
one tool, and a client discovering + calling it.

## Status

v0.1, in active design. Not yet published to npm. See `RCP_SPEC.md`'s "Implementation phasing" and
"Open questions" sections for what's deliberately deferred.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm example   # runs examples/basic/run.ts end-to-end
```
