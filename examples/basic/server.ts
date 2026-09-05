import { createServer, type Server } from 'node:http';
import { z } from 'zod';
import { defineTool } from '../../src/server.js';
import type { RcpManifest } from '../../src/schema.js';

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

const manifest: RcpManifest = {
  rcpVersion: '0.1',
  auth: { type: 'header', header: 'Authorization', scheme: 'Bearer' },
  tools: [getWeather],
};

/** A minimal RCP server: one manifest route, one tool route. No framework. */
export function startExampleServer(port = 4310): Server {
  return createServer((req, res) => {
    if (req.url === '/manifest') {
      if (req.headers.authorization !== `Bearer ${MANIFEST_TOKEN}`) {
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

export { MANIFEST_TOKEN };
