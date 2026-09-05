# `rcp-sdk/server`

For whoever is exposing their own REST endpoints as tools — the RCP **server** role. Builds a
manifest tool entry in code instead of hand-writing the JSON shape.

```ts
import { defineTool } from 'rcp-sdk/server';
```

`defineTool()` never touches the network — it returns a plain `RcpTool` object. Serving it is up
to you: collect your tools into an array and return `{ rcpVersion: '0.1', auth, tools }` from
whatever route your server already has (see `examples/basic/server.ts` for a minimal Node `http`
version with no framework).

## `defineTool(options)`

```ts
import { z } from 'zod';

const getWeather = defineTool({
  name: 'get_weather',
  description: 'Get current weather information for a city.',
  method: 'GET',
  args: z.object({
    city: z.string().describe('City name, e.g. "Paris"'),
  }),
  url: 'https://internal.example.com/weather',
  queryParams: { city: (t) => t.arg('city') },
  responseMappings: { temperatureC: '@temperatureC', conditions: '@conditions' },
});
```

### Options

| Option | Type | Notes |
|---|---|---|
| `name` | `string` | Required. |
| `description` | `string` | Required. What the model sees when deciding whether to call it. |
| `method` | `'GET' \| 'POST' \| 'PUT' \| 'PATCH' \| 'DELETE'` | Required. |
| `args` | a `z.object({...})` schema | Optional. Declares the model-fillable arguments — each field becomes one `params` entry. |
| `url` | `string \| (t) => string` | Required. The callback form gets `t`, typed against `args`. |
| `queryParams` | `Record<string, string \| (t) => string>` | |
| `headers` | `Record<string, string \| (t) => string>` | |
| `body` | `Record<string, unknown> \| (t) => Record<string, unknown>` | Any string value inside (including nested) may use `t.arg(...)`. |
| `responseMappings` | `Record<string, string>` | `{ fieldName: '@json.path' }` — reshapes the tool endpoint's raw JSON response before it reaches the model. `@` starts every path; dot-separated segments walk the tree, numeric segments index arrays. A path that doesn't resolve returns `undefined` for that field rather than failing the call. |

### `t.arg(name)`

Available inside the callback form of `url`/`queryParams`/`headers`/`body`. References one of
`args`' own fields and expands to the literal string `` `{{${name}}}` `` — type-checked against
`args`' keys, so a typo is a compile error rather than a silently-broken template.

```ts
args: z.object({ query: z.string() }),
url: (t) => `https://api.example.com/search?q=${t.arg('query')}`, // -> "...?q={{query}}"
```

### `args` → `params`

Each zod field becomes one `RcpToolParam`:

| zod | `RcpToolParam` |
|---|---|
| `z.string()` / `z.number()` / `z.boolean()` | `type: 'string' \| 'number' \| 'boolean'` |
| `.describe('...')` | `description: '...'` |
| `.optional()` | `required: false` (omitted entirely → `required: true`) |

A type this can't recognize (a wrapped/refined/union field) falls back to `'string'`.

## What this does *not* do

`defineTool()` has no concept of a resolver-bound param, and no way to mark one as "don't ask the
model for this" — that decision belongs entirely to whoever registers your server as a client (see
[`docs/client.md`](./client.md)'s resolvers section). As a server author, the most you can do is
write a clear `description` on a param like `userId` so a client operator knows to intercept it —
the manifest itself carries no such signal.
