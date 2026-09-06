# Security Policy

RCP is a young, actively-changing protocol (see [`ROADMAP.md`](./ROADMAP.md) for what's
implemented vs. designed-only). Treat everything here as best-effort, not a guarantee.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for a suspected security vulnerability in the
protocol design or the reference SDK.

Instead, use GitHub's private vulnerability reporting for this repository:
[github.com/hasanraiyan/rcp/security/advisories/new](https://github.com/hasanraiyan/rcp/security/advisories/new).
If that isn't available to you, open a regular issue asking for a private channel and avoid
including exploit details until one is set up.

Include, if you can:

- What component is affected — the protocol spec (`SPEC.md`), the TypeScript SDK
  (`typescript/`), or the docs site (`web/`).
- Steps to reproduce, or a minimal example manifest/tool that demonstrates the issue.
- What you'd expect a conformant client/server to do instead.

## Scope

- **Protocol design** (`SPEC.md`) — issues like an auth mode that doesn't actually prevent a
  credential leak, a resolver design that lets a model-supplied value override a resolved one, or
  anything that contradicts the trust model in `SPEC.md`'s "Security & trust" section.
- **Reference SDK** (`typescript/`, package `rcp-sdk`) — issues like secrets appearing in logs,
  a resolver-bound param leaking to the model, or request construction that doesn't match what the
  SDK's own docs claim.
- **Not in scope**: vulnerabilities in a *third-party* server or client that merely implements RCP
  — report those to that project directly.

## Design principles that should hold

These come straight from `SPEC.md` §Security & trust — if you find code or a spec detail that
violates one of these, that's a security bug, not just a style issue:

1. A client must not fetch or execute anything from a server its operator didn't explicitly
   register.
2. Tool descriptions from a server are untrusted content.
3. Secrets (auth tokens, resolved resolver values) are client-side only — never serialized into a
   manifest, a tool response, or anything the model sees.
4. A server never receives client-side conversation state beyond what a specific tool call's own
   params/body explicitly carry.

## Disclosure

There's no fixed SLA yet — this is a pre-1.0, single-maintainer project — but reports are taken
seriously and a fix or mitigation will be prioritized over other roadmap work. Credit is given in
the fix's commit/release notes unless you ask not to be named.
