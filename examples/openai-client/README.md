# OpenAI + RCP

An AI application: discovers tools from an RCP manifest and hands them to an
OpenAI tool-calling loop. This is the **client** half of the picture — it has
no idea whether the server behind that manifest is Express, a static JSON
file, or anything else. It only ever imports `rcp-sdk/client` and `openai`.

Run it against [`../express`](../express) — or point it at any other RCP
server's manifest.

## What's here

`client.ts` does four things, in order:

1. **Discover** — `rcp.discover(manifestUrl)` fetches and validates the
   manifest, returning each tool's `exposedParams` (params with no resolver
   configured — see [`SPEC.md`](../../SPEC.md#resolvers) — everything is
   exposed by default in this example, since it registers no resolvers).
2. **Convert** — `toOpenAITool()` turns a `DiscoveredTool` into the
   `{ type: "function", function: { name, description, parameters } }` shape
   OpenAI's `tools` parameter expects. This is the one piece of glue RCP
   needs to plug into any tool-calling model.

   > This conversion is hand-rolled here on purpose — there's no
   > `rcp-sdk/adapters/openai` (or a Gemini/LangChain/LangGraph/DeepAgents
   > equivalent) yet. Tracked in
   > [issue #1](https://github.com/hasanraiyan/rcp/issues/1).

3. **Ask the model** — a standard `chat.completions.create({ model, messages, tools })`
   call.
4. **Execute + loop** — for each `tool_call` the model returns, look up the
   matching `DiscoveredTool` and run `rcp.call(tool, args)` — RCP renders the
   URL, attaches auth, and makes the real HTTP request. The result goes back
   to the model as a `role: "tool"` message, and the loop repeats until the
   model gives a final answer.

## Run it

```bash
npm install
cp .env.example .env   # then fill in OPENAI_API_KEY
```

With [`../express`](../express) already running on port 4321:

```bash
npm start -- "List my tasks, then mark the first incomplete one as done."
```

Expected output looks like:

```
Discovered 4 tool(s) from manifest v0.1 at http://localhost:4321/rcp/manifest:
  - list_tasks: List every task, including whether it's completed.
  - get_task: Get a single task by its id.
  - create_task: Create a new task.
  - complete_task: Mark a task as completed.

-> list_tasks({})
<- [{"id":"1","title":"Write the RCP manifest","completed":false}, ...]
-> complete_task({"id":"1"})
<- {"id":"1","title":"Write the RCP manifest","completed":true}
I marked "Write the RCP manifest" as done.
```

## Pointing this at a different server

Set `RCP_MANIFEST_URL` to any other RCP server's manifest — nothing else in
`client.ts` needs to change:

```bash
RCP_MANIFEST_URL=https://api.example.com/rcp/manifest npm start -- "your prompt"
```
