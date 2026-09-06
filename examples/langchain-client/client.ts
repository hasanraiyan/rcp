import "dotenv/config";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createAgent } from "langchain";
import { createRcpClient } from "rcp-sdk/client";
import { rcpToolsToLangChainTools } from "rcp-sdk/adapters/langchain";

const MANIFEST_URL = process.env.RCP_MANIFEST_URL ?? "http://localhost:4321/rcp/manifest";
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const SPINNER_FRAMES = ["·", "✢", "✳", "✶", "✻", "✽", "✶", "✳", "✢"];
const THINKING_VERBS = [
  "Thinking", "Pondering", "Reasoning", "Analyzing", "Processing",
  "Considering", "Evaluating", "Deliberating", "Working", "Computing",
];

function startSpinner() {
  let i = 0;
  let running = true;
  const verb = THINKING_VERBS[Math.floor(Math.random() * THINKING_VERBS.length)];

  process.stdout.write("\x1b[?25l"); // hide cursor
  const timer = setInterval(() => {
    if (!running) return;
    process.stdout.write(`\r\x1b[2K\x1b[90m${SPINNER_FRAMES[i % SPINNER_FRAMES.length]} ${verb}…\x1b[0m`);
    i++;
  }, 100);

  return {
    stop() {
      running = false;
      clearInterval(timer);
      process.stdout.write(`\r\x1b[2K`);
      process.stdout.write("\x1b[?25h"); // show cursor
    },
  };
}

function printMessage(msg: { _getType(): string; content: string | Array<{ type: string; text?: string }> }) {
  const role = msg._getType();
  let content = "";
  if (typeof msg.content === "string") {
    content = msg.content;
  } else if (Array.isArray(msg.content)) {
    content = msg.content
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text?: string }) => b.text ?? "")
      .join("");
  }
  if (!content) return;

  if (role === "ai") {
    console.log(`\x1b[36mAssistant:\x1b[0m ${content}\n`);
  } else if (role === "tool") {
    const preview = content.length > 300 ? content.slice(0, 300) + "..." : content;
    console.log(`\x1b[90m  [tool]\x1b[0m ${preview}`);
  }
}

const SYSTEM_PROMPT =
  "You can manage the user's tasks using the provided tools. Be concise. Keep conversation history across turns.";

async function main() {
  const rcp = createRcpClient();
  const { manifest, tools } = await rcp.discover(MANIFEST_URL);
  console.log(
    `\x1b[35mConnected to ${MANIFEST_URL} — ${tools.length} tool(s) available (manifest v${manifest.rcpVersion}):\x1b[0m`,
  );
  for (const tool of tools) console.log(`  - ${tool.name}: ${tool.description}`);
  console.log(`\x1b[90mType "exit" or "quit" to stop.\x1b[0m\n`);

  const langchainTools = rcpToolsToLangChainTools(tools, rcp);

  const model = new ChatOpenAI({
    model: MODEL,
    temperature: 0,
    modelKwargs: { reasoning_effort: "none" },
  });
  const agent = createAgent({ model, tools: langchainTools });

  const messages: Array<SystemMessage | HumanMessage> = [new SystemMessage(SYSTEM_PROMPT)];

  const rl = readline.createInterface({ input, output });

  while (true) {
    const input_ = await rl.question("\x1b[32mYou:\x1b[0m ");
    const trimmed = input_.trim();
    if (!trimmed || trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
      console.log("Bye!");
      break;
    }

    messages.push(new HumanMessage(trimmed));

    const spinner = startSpinner();
    try {
      const result = await agent.invoke({ messages: messages.slice(-30) });
      spinner.stop();

      for (const msg of result.messages) printMessage(msg);

      const last = result.messages[result.messages.length - 1];
      if (last && last._getType() === "ai") {
        messages.push(last as unknown as HumanMessage);
      }
    } catch (err) {
      spinner.stop();
      console.error(`\x1b[31mError:\x1b[0m ${err}\n`);
    }
  }

  rl.close();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
