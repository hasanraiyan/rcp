import "dotenv/config";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import OpenAI from "openai";
import { createRcpClient } from "rcp-sdk/client";
import { rcpToolsToOpenAiTools } from "rcp-sdk/adapters/openai";

const MANIFEST_URL = process.env.RCP_MANIFEST_URL ?? "http://localhost:4321/rcp/manifest";
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const openai = new OpenAI();

const SPINNER_FRAMES = ["·", "✢", "✳", "✶", "✻", "✽", "✶", "✳", "✢"];
const THINKING_VERBS = [
  "Thinking", "Pondering", "Reasoning", "Analyzing", "Processing",
  "Considering", "Evaluating", "Deliberating", "Working", "Computing",
];

function startSpinner() {
  let i = 0;
  let running = true;
  const verb = THINKING_VERBS[Math.floor(Math.random() * THINKING_VERBS.length)];

  process.stdout.write("\x1b[?25l");
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
      process.stdout.write("\x1b[?25h");
    },
  };
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

  const openaiTools = rcpToolsToOpenAiTools(tools);

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  const rl = readline.createInterface({ input, output });

  while (true) {
    const input_ = await rl.question("\x1b[32mYou:\x1b[0m ");
    const trimmed = input_.trim();
    if (!trimmed || trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
      console.log("Bye!");
      break;
    }

    messages.push({ role: "user", content: trimmed });

    const spinner = startSpinner();
    try {
      // Tool-calling loop: keep going until the model produces a final text response.
      for (let turn = 0; turn < 8; turn++) {
        const completion = await openai.chat.completions.create({
          model: MODEL,
          messages,
          tools: openaiTools,
          reasoning_effort: "none",
        });

        const message = completion.choices[0]?.message;
        if (!message) throw new Error("No response from the model.");
        messages.push(message);

        if (!message.tool_calls || message.tool_calls.length === 0) {
          spinner.stop();
          if (message.content) console.log(`\x1b[36mAssistant:\x1b[0m ${message.content}\n`);
          break;
        }

        for (const toolCall of message.tool_calls) {
          if (toolCall.type !== "function") continue;

          const tool = tools.find((t) => t.name === toolCall.function.name);
          if (!tool) {
            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: `Unknown tool: "${toolCall.function.name}"`,
            });
            continue;
          }

          const args = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
          console.log(`\x1b[90m  [tool]\x1b[0m ${tool.name}(${JSON.stringify(args)})`);

          const result = await rcp.call(tool, args);
          console.log(`\x1b[90m  [result]\x1b[0m ${JSON.stringify(result.mapped)}`);

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result.mapped),
          });
        }
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
