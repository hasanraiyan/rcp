# Roadmap

What's actually done vs. what's still open, across the protocol design and the reference SDK.
Updated as things move — treat this as the current source of truth over any older status note
elsewhere.

## Protocol (design)

- [x] Manifest format — `GET <manifest-url>` → `{ rcpVersion, auth, tools[] }`.
- [x] Two roles defined — Client and Server, no third "host" layer, no persistent connection.
- [x] Auth — three modes specified: `none`, `header`, `oauth2` (same RFC stack MCP's own auth
      uses: Protected Resource Metadata, AS metadata, Dynamic Client Registration, PKCE, Resource
      Indicators).
- [x] Resolvers — a client-side-only mechanism for values that must never reach the model
      (confirmed MCP has no equivalent).
- [x] Client-injected headers — attaching headers with no manifest correspondence at all.
- [x] Security & trust principles adapted from MCP's.
- [ ] `oauth2` — designed, not implemented by any SDK yet.
- [ ] Per-tool auth overrides — a tool declaring different auth than its server's default is
      specified in the schema, but no SDK actually executes it yet.
- [ ] A `skills`/resources-equivalent primitive — deliberately out of scope for v0.1; only a rough
      shape sketched (a parallel `skills` array) if real demand shows up.
- [ ] Open questions not yet decided: `rcpVersion` in the body vs. a header; a required vs.
      recommended default for what happens when a resolver can't produce a value; whether to
      recommend a naming convention for commonly-resolved params; whether a server ever needs to
      push a manifest-changed notification.

## TypeScript SDK (`typescript/`, package `rcp-sdk`)

**Client (`rcp-sdk/client`)**
- [x] `discover()` — fetch, schema-validate, version-check, strip resolver-bound params.
- [x] `call()` — template rendering, resolver filling, auth + header attachment, response mapping.
- [x] Auth: `none`, `header`.
- [x] Resolvers.
- [x] Client-injected headers.
- [x] Pluggable logging (silent by default; never logs secrets, headers, bodies, or resolved
      values — only tool names, methods, status codes, param names).
- [x] `describeManifest()` — human-readable printout of what a server is asking for.
- [ ] `oauth2` — throws a clear "not implemented" error rather than doing nothing.
- [ ] Per-tool auth overrides — throws a clear "not implemented" error rather than using the
      wrong credentials.

**Server (`rcp-sdk/server`)**
- [x] `defineTool()` + `t.arg()` — build a manifest tool entry in code from a zod schema.
- [x] zod → `params` derivation (type, required, description).

**Tooling & quality**
- [x] 39 tests passing (schema, template engine, response mapper, client, server).
- [x] Clean `tsc --noEmit`, `tsup` build (ESM + CJS + `.d.ts`).
- [x] End-to-end example (`examples/basic`) verified working live.
- [x] API docs for both entry points (`docs/client.md`, `docs/server.md`).
- [x] Architecture diagrams (root `README.md`).
- [x] Lint/formatting setup (eslint/prettier) — flat `eslint.config.js` (typescript-eslint
      recommended) + `.prettierrc.json`, wired to `lint`/`format`/`format:check` scripts. `web/`
      got the same Prettier setup layered onto its existing `eslint-config-next` config.
- [x] Published to npm — `rcp-sdk` is live at
      [npmjs.com/package/rcp-sdk](https://www.npmjs.com/package/rcp-sdk) (currently `0.1.1`).
- [x] Pushed to a GitHub remote — [github.com/hasanraiyan/rcp](https://github.com/hasanraiyan/rcp).

## Examples (`examples/`)

- [x] `examples/express` — an Express REST API + one route serving an RCP manifest via
      `defineTool()`. Server-only; no AI/model code.
- [x] `examples/openai-client` — discovers a manifest and runs an OpenAI tool-calling loop against
      it. Client-only; no Express/FastAPI code. Installs `rcp-sdk` from the real npm package.
- [ ] Framework adapters (`rcp-sdk/adapters/openai`, `/gemini`, `/langchain`, ...) so the
      manifest-to-tool-schema conversion currently hand-rolled in `examples/openai-client` doesn't
      have to be re-derived by every consumer — tracked in
      [issue #1](https://github.com/hasanraiyan/rcp/issues/1).
- [ ] A Python/FastAPI server example — deliberately dropped from this pass; would double as proof
      that an RCP server needs no SDK in any language (a hand-built manifest dict is fully
      conformant).

## Beyond v1 (not started, no commitment yet)

- [ ] A second-language reference SDK (e.g. `python/`) — the repo is now structured to support
      this (each language gets its own top-level folder), but nothing has been written.
- [ ] Any tooling around the `skills`/resources idea, if it turns out to be needed.
- [ ] A CLI (e.g. `rcp inspect <url>` wrapping `describeManifest()`) — not planned, just a natural
      extension of what already exists if it'd be useful.
