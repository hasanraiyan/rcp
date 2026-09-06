import "dotenv/config";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
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

  const geminiTools = rcpToolsToGeminiInteractionsTools(tools);

  const rl = readline.createInterface({ input, output });

  while (true) {
    const input_ = await rl.question("\x1b[32mYou:\x1b[0m ");
    const trimmed = input_.trim();
    if (!trimmed || trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
      console.log("Bye!");
      break;
    }

    const spinner = startSpinner();
    try {
      // Stateful tool-calling loop via Interactions API.
      // Start with the user's text; chain via previous_interaction_id after each turn.
      let interactionInput: string | Interactions.Step[] =
        `${SYSTEM_PROMPT}\n\nUser: ${trimmed}`;
      let previousId: string | undefined;
      let finalText: string | undefined;

      for (let turn = 0; turn < 8; turn++) {
        const interaction = await ai.interactions.create({
          model: `models/${MODEL}`,
          input: interactionInput,
          tools: geminiTools,
          previous_interaction_id: previousId,
        });

        const steps = interaction.steps ?? [];
        const functionResults: Interactions.FunctionResultStep[] = [];

        for (const step of steps) {
          if (step.type === "function_call") {
            console.log(`\x1b[90m  [tool]\x1b[0m ${step.name}(${JSON.stringify(step.arguments)})`);

            const tool = tools.find((t) => t.name === step.name);
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
          finalText = interaction.output_text;
          break;
        }

        // Chain: send function results as the next input, linking to this interaction.
        interactionInput = functionResults;
        previousId = interaction.id;
      }

      spinner.stop();

      if (finalText) {
        console.log(`\x1b[36mAssistant:\x1b[0m ${finalText}\n`);
      } else {
        console.warn("Stopped after 8 turns without a final answer.\n");
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
