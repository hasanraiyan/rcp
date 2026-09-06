import type { Metadata } from "next";
import { DocPage } from "@/components/docs/doc-page";
import { CodeBlock, Callout } from "@/components/docs/code-block";

export const metadata: Metadata = {
  title: "Gemini — rcp-sdk/adapters/gemini",
  description:
    "API reference for the Gemini adapter: convert RCP-discovered tools into Google GenAI function-calling format.",
};

export default function GeminiSdkPage() {
  return (
    <DocPage
      title="Gemini — rcp-sdk/adapters/gemini"
      description="Convert RCP-discovered tools into Google GenAI (Gemini) function-calling format. Supports both the Interactions API and the classic generateContent API."
    >
      <CodeBlock
        lang="typescript"
        code={`import { rcpToolsToGeminiInteractionsTools, loadGeminiTools } from 'rcp-sdk/adapters/gemini';`}
      />
      <p>
        The Gemini adapter converts <code>DiscoveredTool[]</code> from{" "}
        <code>rcp.discover()</code> into Gemini function-calling format. Supports two APIs:
        the Interactions API (simpler) and classic <code>generateContent</code> (wrapped).
      </p>

      <h2>Interactions API</h2>
      <p>
        The simpler format — flat tool entries passed to{" "}
        <code>ai.interactions.create()</code>.
      </p>
      <CodeBlock
        lang="typescript"
        code={`import { createRcpClient } from 'rcp-sdk/client';
import { rcpToolsToGeminiInteractionsTools } from 'rcp-sdk/adapters/gemini';
import { GoogleGenAI } from '@google/genai';

const rcp = createRcpClient();
const { tools } = await rcp.discover('https://example.com/rcp/manifest');
const geminiTools = rcpToolsToGeminiInteractionsTools(tools);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const interaction = await ai.interactions.create({
  model: 'models/gemini-2.5-flash',
  input: prompt,
  tools: geminiTools,
});`}
      />

      <h2>Classic generateContent</h2>
      <p>
        The wrapped format — <code>functionDeclarations</code> inside a{" "}
        <code>tools</code> array entry.
      </p>
      <CodeBlock
        lang="typescript"
        code={`import { rcpToolsToGeminiClassicTools } from 'rcp-sdk/adapters/gemini';

const classicTools = rcpToolsToGeminiClassicTools(tools);

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: prompt,
  config: { tools: classicTools },
});`}
      />

      <h2>loadGeminiTools(manifestUrl, client, options?)</h2>
      <p>
        One-call helper: discovers the manifest and returns both formats.
      </p>
      <CodeBlock
        lang="typescript"
        code={`import { loadGeminiTools } from 'rcp-sdk/adapters/gemini';

const { interactionsTools, classicTools, discovered } = await loadGeminiTools(
  'https://example.com/rcp/manifest',
  rcp,
  { serverName: 'myApi' },
);`}
      />

      <h2>Options</h2>
      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Type</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>serverName</code>
            </td>
            <td>
              <code>string</code>
            </td>
            <td>
              Prefix for tool names: <code>&quot;myApi__get_weather&quot;</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>prefixToolNameWithServerName</code>
            </td>
            <td>
              <code>boolean</code>
            </td>
            <td>
              If true and <code>serverName</code> is set, tool names become{" "}
              <code>serverName__toolName</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>additionalToolNamePrefix</code>
            </td>
            <td>
              <code>string</code>
            </td>
            <td>Extra prefix applied before server name.</td>
          </tr>
        </tbody>
      </table>

      <Callout>
        The Interactions API uses a flat <code>{`{ type: 'function', name, ... }`}</code> format.
        The classic API wraps declarations in{" "}
        <code>{`{ functionDeclarations: [...] }`}</code>. Both produce valid Gemini tool schemas.
      </Callout>
    </DocPage>
  );
}
