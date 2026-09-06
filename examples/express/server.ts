import express from "express";
import { z } from "zod";
import { defineTool } from "rcp-sdk/server";
import type { RcpManifest } from "rcp-sdk";

const PORT = Number(process.env.PORT ?? 4321);
const BASE_URL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

// ---------------------------------------------------------------------------
// Your existing REST API. Nothing below this line knows or cares about RCP —
// it's a completely ordinary Express app you might already have.
// ---------------------------------------------------------------------------

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

const tasks: Task[] = [
  { id: "1", title: "Write the RCP manifest", completed: false },
  { id: "2", title: "Wire up an AI client", completed: false },
];
let nextId = tasks.length + 1;

const app = express();
app.use(express.json());

app.get("/api/tasks", (_req, res) => {
  res.json(tasks);
});

app.get("/api/tasks/:id", (req, res) => {
  const task = tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json(task);
});

app.post("/api/tasks", (req, res) => {
  const title = String(req.body?.title ?? "").trim();
  if (!title) return res.status(400).json({ error: "title is required" });
  const task: Task = { id: String(nextId++), title, completed: false };
  tasks.push(task);
  res.status(201).json(task);
});

app.post("/api/tasks/:id/complete", (req, res) => {
  const task = tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  task.completed = true;
  res.json(task);
});

// ---------------------------------------------------------------------------
// The only RCP-specific part of this whole file: describe four of the routes
// above as tools, and serve the resulting manifest at one extra route. No AI
// SDK, no model, no API key — that all lives in ../openai-client instead.
// ---------------------------------------------------------------------------

const listTasks = defineTool({
  name: "list_tasks",
  description: "List every task, including whether it's completed.",
  method: "GET",
  url: `${BASE_URL}/api/tasks`,
});

const getTask = defineTool({
  name: "get_task",
  description: "Get a single task by its id.",
  method: "GET",
  args: z.object({
    id: z.string().describe('The task\'s id, e.g. "1"'),
  }),
  url: (t) => `${BASE_URL}/api/tasks/${t.arg("id")}`,
});

const createTask = defineTool({
  name: "create_task",
  description: "Create a new task.",
  method: "POST",
  args: z.object({
    title: z.string().describe("What the task is"),
  }),
  url: `${BASE_URL}/api/tasks`,
  body: (t) => ({ title: t.arg("title") }),
});

const completeTask = defineTool({
  name: "complete_task",
  description: "Mark a task as completed.",
  method: "POST",
  args: z.object({
    id: z.string().describe("The task's id"),
  }),
  url: (t) => `${BASE_URL}/api/tasks/${t.arg("id")}/complete`,
});

const manifest: RcpManifest = {
  rcpVersion: "0.1",
  auth: { type: "none" },
  tools: [listTasks, getTask, createTask, completeTask],
};

app.get("/rcp/manifest", (_req, res) => {
  res.json(manifest);
});

app.listen(PORT, () => {
  console.log(`Task API running at   ${BASE_URL}`);
  console.log(`RCP manifest served at ${BASE_URL}/rcp/manifest`);
  console.log(`\nNow point the client example at this manifest URL:`);
  console.log(`  cd ../openai-client && RCP_MANIFEST_URL=${BASE_URL}/rcp/manifest npm start`);
});
