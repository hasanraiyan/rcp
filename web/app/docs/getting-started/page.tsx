import type { Metadata } from "next";
import { DocPage } from "@/components/docs/doc-page";
import { CodeBlock, Callout } from "@/components/docs/code-block";

export const metadata: Metadata = {
  title: "Getting started",
  description:
    "Install rcp-sdk, expose one tool from a server, and discover + call it from a client — a complete end-to-end walkthrough.",
};

export default function GettingStartedPage() {
  return (
    <DocPage
      title="Getting started"
      description="Install the reference SDK, expose one tool from a server, and call it from a client — end to end."
    >
      <h2>Install</h2>
      <CodeBlock label="shell" lang="bash" code={`npm install rcp-sdk`} />
      <p>
        <code>rcp-sdk</code> ships two entry points — import whichever role you&rsquo;re building.
      </p>
      <CodeBlock
        label="typescript"
        lang="typescript"
        code={`// Building the AI application? Import the client.
import { createRcpClient } from 'rcp-sdk/client';

// Exposing your own REST endpoints as tools? Import the server helper.
import { defineTool } from 'rcp-sdk/server';`}
      />

      <h2>1. Define a tool on the server</h2>
      <p>
        <code>defineTool()</code> never touches the network — it returns a plain object. Serving it
        is up to you: collect your tools into an array and return them from whatever route your
        server already has.
      </p>
      <CodeBlock
        label="server.ts"
        lang="typescript"
        code={`import { defineTool } from 'rcp-sdk/server';
import { z } from 'zod';

export const getWeather = defineTool({
  name: 'get_weather',
  description: 'Get current weather information for a city.',
  method: 'GET',
  args: z.object({
    city: z.string().describe('City name, e.g. "Paris"'),
  }),
  url: 'https://internal.example.com/weather',
  queryParams: { city: (t) => t.arg('city') },
  responseMappings: {
    temperatureC: '@temperatureC',
    conditions: '@conditions',
  },
});`}
      />

      <h2>2. Serve the manifest</h2>
      <p>
        Return <code>{"{ rcpVersion, auth, tools }"}</code> from a single route — a plain Node{" "}
        <code>http</code> server is a fully conformant example, no framework required.
      </p>
      <CodeBlock
        label="server.ts (continued)"
        lang="typescript"
        code={`import { createServer } from 'node:http';

const manifest = {
  rcpVersion: '0.1',
  auth: { type: 'header', header: 'Authorization', scheme: 'Bearer' },
  tools: [getWeather],
};

createServer((req, res) => {
  if (req.url === '/manifest') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(manifest));
    return;
  }
  // ...the /weather route the tool's url points at
}).listen(4310);`}
      />

      <h2>3. Discover and call it from a client</h2>
      <CodeBlock
        label="client.ts"
        lang="typescript"
        code={`import { createRcpClient } from 'rcp-sdk/client';

const client = createRcpClient({
  auth: { type: 'header', secret: process.env.SERVER_TOKEN! },
});

const { manifest, tools } = await client.discover('http://localhost:4310/manifest');
console.log(\`Discovered \${tools.length} tool(s) from manifest v\${manifest.rcpVersion}\`);

const weather = tools.find((t) => t.name === 'get_weather')!;
const result = await client.call(weather, { city: 'Paris' });

console.log(result.mapped);
// { temperatureC: 18, conditions: 'Partly cloudy' }`}
      />

      <Callout>
        <code>discover()</code> returns each tool&rsquo;s <code>exposedParams</code> alongside its
        raw <code>params</code> — show <code>exposedParams</code> to your model, since that&rsquo;s
        the list with any resolver-bound params already stripped out. See{" "}
        <a href="/docs/concepts/resolvers">Resolvers</a>.
      </Callout>

      <p>
        That&rsquo;s the whole loop. For a real-world Express + OpenAI tool-calling walkthrough, or
        the smallest possible runnable version with no framework at all, see{" "}
        <a href="/docs/examples">Examples</a>.
      </p>
    </DocPage>
  );
}
