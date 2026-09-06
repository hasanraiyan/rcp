# Contributing to RCP

RCP is developed as an open protocol plus a reference SDK. Contributions are welcome, especially
around protocol design, security, SDK implementations, framework integrations, examples, and
documentation.

## Repository layout

```text
rcp/
├── SPEC.md            # the protocol itself — start here
├── SECURITY.md         # how to report a vulnerability
├── ROADMAP.md          # what's done vs. designed-only, kept current
├── typescript/         # reference SDK (package `rcp-sdk`)
├── examples/           # standalone, runnable integrations (Express, FastAPI, ...)
└── web/                # rcp.hasanraiyan.me — marketing site + docs
```

## Before opening a PR

- **Protocol changes** (anything touching `SPEC.md`): open an issue or discussion first. The spec
  is pre-1.0 and changes there ripple into every SDK and example — get alignment before writing
  code.
- **SDK changes** (`typescript/`): should come with tests. Run the full check locally before
  pushing:

  ```bash
  cd typescript
  pnpm install
  pnpm run typecheck
  pnpm run lint
  pnpm run test
  pnpm run format:check
  ```

  `pnpm run format` auto-fixes formatting; `pnpm run lint` must pass with zero errors.

- **Web app changes** (`web/`):

  ```bash
  cd web
  npm install
  npm run lint
  npm run format:check
  npm run build
  ```

- **New examples** (`examples/`): should be self-contained (their own `package.json` /
  `requirements.txt`), runnable from a clean checkout in a few commands, and come with a README
  that states the exact steps. Point `rcp-sdk` at the local package (`file:../../typescript`)
  rather than a published version, so examples always exercise the current SDK code.

## Commit and PR style

- Keep commits scoped — a protocol clarification, an SDK fix, and a new example are three PRs, not
  one.
- Explain *why*, not just *what*, in the PR description — especially for anything touching
  `SPEC.md` or the SDK's public API.
- Update `ROADMAP.md` when a checklist item moves from not-done to done, or vice versa.

## Reporting bugs vs. security issues

Regular bugs (a broken example, a docs typo, a failing test): open a GitHub issue.

Anything that looks like a security issue — see [`SECURITY.md`](./SECURITY.md) — should **not** go
through a public issue first.

## License

By contributing, you agree your contribution is licensed under this repository's
[LICENSE](./LICENSE).
