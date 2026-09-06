# Express + RCP

An ordinary Express REST API — a tiny in-memory task manager — with one extra
route: `GET /rcp/manifest`, which describes four of its own endpoints as AI
tools using [`rcp-sdk`](https://www.npmjs.com/package/rcp-sdk)'s server-side
helper.


## What's here

- `GET /api/tasks`, `GET /api/tasks/:id`, `POST /api/tasks`,
  `POST /api/tasks/:id/complete` — a completely normal REST API. Imagine this
  is the API you already have.
- `GET /rcp/manifest` — the only RCP-specific route. Returns a JSON manifest
  describing `list_tasks`, `get_task`, `create_task`, and `complete_task` as
  callable tools, each pointing back at one of the routes above.

Open `server.ts` — the whole manifest is ~15 lines of `defineTool()` calls
around REST routes you'd write anyway.

## Run it

```bash
npm install
npm start
```

This starts the API on `http://localhost:4321`. Confirm the manifest is
being served:

```bash
curl http://localhost:4321/rcp/manifest
```

Then, in a second terminal, run [`../openai-client`](../openai-client)
against it (its default `RCP_MANIFEST_URL` already points here).

## Adding auth

This example uses `{ "type": "none" }` to keep it copy-pasteable. To require
a shared secret on every request (manifest fetch included), change the
manifest's `auth` to:

```ts
auth: { type: "header", header: "Authorization", scheme: "Bearer" }
```

...and check for it yourself in an Express middleware — the manifest only
*declares* the auth shape, RCP doesn't run any auth logic on the server side.
See [`SPEC.md`](../../SPEC.md#auth) for the full auth model.
