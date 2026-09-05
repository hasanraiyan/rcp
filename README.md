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

## SDKs

Each language implementation lives in its own top-level folder — same protocol, same manifest
shape, independent tooling/build/versioning per language:

- [`typescript/`](./typescript) — `rcp-sdk`, the reference implementation. Start here.

More languages may be added the same way later (e.g. a `python/` folder), each self-contained with
its own package manifest, tests, and docs.

## Status

v0.1, in active design. See [`typescript/README.md`](./typescript/README.md) for the reference
SDK's current implementation status.
