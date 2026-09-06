import type { Metadata } from "next";
import { DocPage } from "@/components/docs/doc-page";
import { CodeBlock, Callout } from "@/components/docs/code-block";

const REPO = "https://github.com/hasanraiyan/rcp";

export const metadata: Metadata = {
  title: "Examples",
  description:
    "A real-world Express + OpenAI tool-calling example, plus the smallest possible end-to-end RCP run with no framework on either side.",
  alternates: { canonical: "/docs/examples" },
};

export default function ExamplesPage() {
  return (
    <DocPage
      title="Examples"
      description="A real-world Express + OpenAI tool-calling example, plus the smallest possible end-to-end run with no framework on either side."
    >
      <h2>Express + OpenAI (real-world example)</h2>
      <p>
        Two standalone, runnable projects in{" "}
        <a href={`${REPO}/tree/master/examples`} target="_blank" rel="noopener noreferrer">
          <code>examples/</code>
        </a>{" "}
        — an Express REST API that exposes an RCP manifest, and an AI application that discovers it
        and calls tools through an OpenAI tool-calling loop. Both install <code>rcp-sdk</code> from
        the real npm package, not this repo&rsquo;s own source.
      </p>
      <CodeBlock
        label="shell"
        lang="bash"
        code={`git clone ${REPO}.git && cd rcp/examples

cd express && npm install && npm start &        # your REST API + one /rcp/manifest route
cd ../openai-client && npm install               # the AI application side
cp .env.example .env                             # add your OPENAI_API_KEY
npm start -- "List my tasks, then mark the first incomplete one as done."`}
      />
      <Callout>
        The two are deliberately split — <code>examples/express</code> has no OpenAI code, and{" "}
        <code>examples/openai-client</code> has no Express code. See{" "}
        <a href={`${REPO}/tree/master/examples/express`} target="_blank" rel="noopener noreferrer">
          examples/express
        </a>{" "}
        and{" "}
        <a
          href={`${REPO}/tree/master/examples/openai-client`}
          target="_blank"
          rel="noopener noreferrer"
        >
          examples/openai-client
        </a>{" "}
        on GitHub for the full source and README.
      </Callout>

      <h2>Minimal example (no framework)</h2>
      <p>
        The smallest possible end-to-end run — a plain Node <code>http</code> server exposing one
        tool, and a client discovering + calling it. No Express, no OpenAI, no framework on either
        side.
      </p>

      <h3>The server</h3>
      <p>
        One route for the manifest, one route for the tool itself. Auth is <code>header</code>, so
        the manifest fetch requires a bearer token too.
      </p>
      <CodeBlock
        label="server.ts"
        lang="typescript"
        code={`import { createServer, type Server } from 'node:http';
import { z } from 'zod';
import { defineTool } from 'rcp-sdk/server';

const MANIFEST_TOKEN = 'demo-secret';

export const getWeather = defineTool({
  name: 'get_weather',
  description: 'Get current weather information for a city.',
  method: 'GET',
  args: z.object({
    city: z.string().describe('City name, e.g. "Paris"'),
  }),
  url: 'http://localhost:4310/weather',
  queryParams: { city: (t) => t.arg('city') },
  responseMappings: {
    temperatureC: '@temperatureC',
    conditions: '@conditions',
  },
});

const manifest = {
  rcpVersion: '0.1',
  auth: { type: 'header', header: 'Authorization', scheme: 'Bearer' },
  tools: [getWeather],
};

export function startExampleServer(port = 4310): Server {
  return createServer((req, res) => {
    if (req.url === '/manifest') {
      if (req.headers.authorization !== \`Bearer \${MANIFEST_TOKEN}\`) {
        res.writeHead(401).end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(manifest));
      return;
    }

    if (req.url?.startsWith('/weather')) {
      const city = new URL(req.url, 'http://localhost').searchParams.get('city') ?? 'unknown';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ city, temperatureC: 18, conditions: 'Partly cloudy' }));
      return;
    }

    res.writeHead(404).end();
  }).listen(port);
}

export { MANIFEST_TOKEN };`}
      />

      <h3>The client</h3>
      <CodeBlock
        label="run.ts"
        lang="typescript"
        code={`import { createRcpClient } from 'rcp-sdk/client';
import { MANIFEST_TOKEN, startExampleServer } from './server.js';

async function main() {
  const server = startExampleServer(4310);

  try {
    const client = createRcpClient({
      auth: { type: 'header', secret: MANIFEST_TOKEN },
    });

    const { manifest, tools } = await client.discover('http://localhost:4310/manifest');
    console.log(\`Discovered \${tools.length} tool(s) from manifest v\${manifest.rcpVersion}:\`);
    for (const tool of tools) {
      console.log(\`  - \${tool.name}: \${tool.description}\`);
    }

    const weather = tools.find((t) => t.name === 'get_weather');
    if (!weather) throw new Error('get_weather tool not found in manifest');

    const result = await client.call(weather, { city: 'Paris' });
    console.log('\\nCalled get_weather({ city: "Paris" }):');
    console.log(JSON.stringify(result.mapped, null, 2));
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});`}
      />

      <h3>Output</h3>
      <CodeBlock
        label="$ pnpm example"
        lang="text"
        code={`Discovered 1 tool(s) from manifest v0.1:
  - get_weather: Get current weather information for a city.

Called get_weather({ city: "Paris" }):
{
  "temperatureC": 18,
  "conditions": "Partly cloudy"
}`}
      />

      <Callout>
        This is <code>examples/basic</code> in the repo, runnable as-is with{" "}
        <code>pnpm example</code>.{" "}
        <a
          href={`${REPO}/tree/master/typescript/examples/basic`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View it on GitHub
        </a>
        .
      </Callout>
    </DocPage>
  );
}
