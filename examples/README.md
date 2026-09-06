# Examples

Two small, standalone projects showing the two sides of RCP:

| Folder | Role | What it is |
|---|---|---|
| [`express/`](./express) | **Server** | An Express REST API + one extra route serving an RCP manifest. No AI/model code. |
| [`openai-client/`](./openai-client) | **Client** | An OpenAI tool-calling loop that discovers tools from any RCP manifest and calls them. No Express/FastAPI code. |

They're deliberately split — a server never needs to know or care what kind
of AI application (if any) is calling it, and a client never needs to know
what framework served the manifest it's discovering. Run them together:

```bash
cd express && npm install && npm start
# in another terminal:
cd openai-client && npm install && cp .env.example .env  # add your OPENAI_API_KEY
npm start -- "List my tasks, then mark the first incomplete one as done."
```

Both install `rcp-sdk` from the real npm package — nothing here depends on
this repo's own source tree, so the same steps work if you copy either
folder out on its own.
