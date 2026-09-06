import "dotenv/config";
import OpenAI from "openai";
import { createRcpClient } from "rcp-sdk/client";
import { rcpToolsToOpenAiTools } from "rcp-sdk/adapters/openai";

const MANIFEST_URL = process.env.RCP_MANIFEST_URL ?? "http://localhost:4321/rcp/manifest";
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const openai = new OpenAI();

async function main() {
  const prompt =
    process.argv.slice(2).join(" ") ||
    "List my tasks, then mark the first incomplete one as done.";

  // 1. Discover the manifest — same call regardless of which server wrote it.
  const rcp = createRcpClient();
  const { manifest, tools } = await rcp.discover(MANIFEST_URL);
  const toolByName = new Map(tools.map((tool) => [tool.name, tool]));

  console.log(
    `Discovered ${tools.length} tool(s) from manifest v${manifest.rcpVersion} at ${MANIFEST_URL}:`,
  );
  for (const tool of tools) console.log(`  - ${tool.name}: ${tool.description}`);
  console.log();

  // 2. Convert them to OpenAI's tool-calling format via the adapter.
  const openaiTools = rcpToolsToOpenAiTools(tools);

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: "You can manage the user's tasks using the provided tools. Be concise.",
    },
    { role: "user", content: prompt },
  ];

  // 3. The standard tool-calling loop: ask the model, execute what it asks
  //    for via RCP, feed the result back, repeat until it gives a final answer.
  for (let turn = 0; turn < 8; turn++) {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      tools: openaiTools,
      reasoning_effort: "none"
    });

    const message = completion.choices[0]?.message;
    if (!message) throw new Error("No response from the model.");
    messages.push(message);

    if (!message.tool_calls || message.tool_calls.length === 0) {
      console.log(message.content);
      return;
    }

    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== "function") continue;

      const tool = toolByName.get(toolCall.function.name);
      if (!tool) {
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: `Unknown tool: "${toolCall.function.name}"`,
        });
        continue;
      }

      const args = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
      console.log(`-> ${tool.name}(${JSON.stringify(args)})`);

      // 4. Execute it via RCP — renders URL, attaches auth, applies responseMappings.
      const result = await rcp.call(tool, args);
      console.log(`<- ${JSON.stringify(result.mapped)}`);

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result.mapped),
      });
    }
  }

  console.warn("Stopped after 8 turns without a final answer.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
