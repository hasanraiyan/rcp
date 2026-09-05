import { createRcpClient } from '../../src/client.js';
import { MANIFEST_TOKEN, startExampleServer } from './server.js';

async function main() {
  const server = startExampleServer(4310);

  try {
    const client = createRcpClient({
      auth: { type: 'header', secret: MANIFEST_TOKEN },
    });

    const { manifest, tools } = await client.discover('http://localhost:4310/manifest');
    console.log(`Discovered ${tools.length} tool(s) from manifest v${manifest.rcpVersion}:`);
    for (const tool of tools) {
      console.log(`  - ${tool.name}: ${tool.description}`);
    }

    const weather = tools.find((t) => t.name === 'get_weather');
    if (!weather) throw new Error('get_weather tool not found in manifest');

    const result = await client.call(weather, { city: 'Paris' });
    console.log('\nCalled get_weather({ city: "Paris" }):');
    console.log(JSON.stringify(result.mapped, null, 2));
  } finally {
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
