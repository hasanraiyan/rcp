import "dotenv/config";
import OpenAI from "openai";
import { createRcpClient, type DiscoveredTool } from "rcp-sdk/client";

const MANIFEST_URL = process.env.RCP_MANIFEST_URL ?? "http://localhost:4321/rcp/manifest";
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const openai = new OpenAI(); // reads OPENAI_API_KEY from the environment

// ---------------------------------------------------------------------------
// The only piece of glue RCP needs to plug into ANY tool-calling model: turn
// a discovered tool's exposedParams into the JSON Schema `parameters` object
// OpenAI's tool-calling API expects. This has nothing Express- or
// FastAPI-specific about it — it works against whatever manifest URL you
// point RCP_MANIFEST_URL at.
// ---------------------------------------------------------------------------
function toOpenAITool(tool: DiscoveredTool): OpenAI.ChatCompletionTool {
  const properties: Record<string, { type: string; description?: string }> = {};
  const required: string[] = [];

  for (const param of tool.exposedParams) {
    properties[param.name] = {
      type: param.type,
      ...(param.description ? { description: param.description } : {}),
    };
    if (param.required !== false) required.push(param.name);
  }

  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: { type: "object", properties, required, additionalProperties: false },
    },
  };
}

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

  // 2. Convert them to OpenAI's tool-calling format.
  const openaiTools = tools.map(toOpenAITool);

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

      // 4. Execute it: RCP renders the URL, attaches auth, makes the real
      //    HTTP call against the actual REST API, and applies any
      //    responseMappings — the model never talks to the API directly.
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
