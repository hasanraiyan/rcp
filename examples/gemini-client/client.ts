import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import type { Interactions } from "@google/genai";
import { createRcpClient } from "rcp-sdk/client";
import { rcpToolsToGeminiInteractionsTools } from "rcp-sdk/adapters/gemini";

const MANIFEST_URL = process.env.RCP_MANIFEST_URL ?? "http://localhost:4321/rcp/manifest";
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

async function main() {
  const prompt =
    process.argv.slice(2).join(" ") ||
    "List my tasks, then mark the first incomplete one as done.";

  // 1. Discover tools from an RCP manifest.
  const rcp = createRcpClient();
  const { manifest, tools } = await rcp.discover(MANIFEST_URL);
  console.log(
    `\x1b[35mConnected to ${MANIFEST_URL} — ${tools.length} tool(s) available (manifest v${manifest.rcpVersion}):\x1b[0m`,
  );
  for (const tool of tools) console.log(`  - ${tool.name}: ${tool.description}`);
  console.log();

  // 2. Convert to Gemini Interactions API format.
  const geminiTools = rcpToolsToGeminiInteractionsTools(tools);
  const toolByName = new Map(tools.map((t) => [t.name, t]));

  console.log(`\x1b[32mYou:\x1b[0m ${prompt}\n`);

  // 3. Tool-calling loop via Interactions API (stateful, chained with previous_interaction_id).
  let input: string | Interactions.Step[] = prompt;
  let previousId: string | undefined;

  for (let turn = 0; turn < 8; turn++) {
    const spinner = startSpinner();

    const interaction = await ai.interactions.create({
      model: `models/${MODEL}`,
      input,
      tools: geminiTools,
      previous_interaction_id: previousId,
    });

    spinner.stop();

    const steps = interaction.steps ?? [];
    const functionResults: Interactions.FunctionResultStep[] = [];

    for (const step of steps) {
      if (step.type === "function_call") {
        console.log(`\x1b[90m  [tool]\x1b[0m ${step.name}(${JSON.stringify(step.arguments)})`);

        const tool = toolByName.get(step.name);
        if (!tool) {
          console.log(`\x1b[90m  [error]\x1b[0m Unknown tool: ${step.name}`);
          continue;
        }

        const result = await rcp.call(tool, step.arguments);
        console.log(`\x1b[90m  [result]\x1b[0m ${JSON.stringify(result.mapped)}`);

        functionResults.push({
          type: "function_result",
          name: step.name,
          call_id: step.id,
          result: [{ type: "text", text: JSON.stringify(result.mapped) }],
        });
      }
    }

    // No function calls — this is the final text response.
    if (functionResults.length === 0) {
      const outputText = interaction.output_text;
      if (outputText) console.log(`\x1b[36mAssistant:\x1b[0m ${outputText}\n`);
      return;
    }

    // Chain: send function results as the next input, linking to this interaction.
    input = functionResults;
    previousId = interaction.id;
  }

  console.warn("Stopped after 8 turns without a final answer.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
