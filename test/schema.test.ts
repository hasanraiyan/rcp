import { describe, expect, it } from 'vitest';
import { RcpManifestSchema } from '../src/schema.js';

describe('RcpManifestSchema', () => {
  it('parses a minimal valid manifest', () => {
    const result = RcpManifestSchema.safeParse({
      rcpVersion: '0.1',
      tools: [
        {
          name: 'get_weather',
          description: 'Get current weather for a location.',
          method: 'GET',
          url: 'https://api.example.com/weather',
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.auth).toEqual({ type: 'none' });
      expect(result.data.tools[0]?.params).toEqual([]);
    }
  });

  it('parses all three auth variants', () => {
    for (const auth of [
      { type: 'none' },
      { type: 'header', header: 'Authorization', scheme: 'Bearer' },
      { type: 'oauth2', resource: 'https://api.example.com' },
    ]) {
      const result = RcpManifestSchema.safeParse({ rcpVersion: '0.1', auth, tools: [] });
      expect(result.success, JSON.stringify(auth)).toBe(true);
    }
  });

  it('rejects a tool missing a required field', () => {
    const result = RcpManifestSchema.safeParse({
      rcpVersion: '0.1',
      tools: [{ description: 'missing name/method/url' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown auth type', () => {
    const result = RcpManifestSchema.safeParse({
      rcpVersion: '0.1',
      auth: { type: 'basic' },
      tools: [],
    });
    expect(result.success).toBe(false);
  });

  it('accepts a tool with params, queryParams, headers, body, and responseMappings', () => {
    const result = RcpManifestSchema.safeParse({
      rcpVersion: '0.1',
      tools: [
        {
          name: 'search',
          description: 'Search something.',
          method: 'POST',
          url: 'https://api.example.com/search',
          params: [{ name: 'query', type: 'string', required: true }],
          queryParams: { q: '{{query}}' },
          headers: { 'X-Trace': '{{query}}' },
          body: { term: '{{query}}' },
          responseMappings: { title: '@data.title' },
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
