import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createRcpClient,
  describeManifest,
  RcpAuthNotImplementedError,
  RcpManifestValidationError,
  RcpResolverError,
  RcpToolAuthOverrideNotImplementedError,
  RcpVersionMismatchError,
  type RcpLogger,
} from "../src/client.js";
import type { RcpTool } from "../src/schema.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createRcpClient", () => {
  it('throws immediately when configured with auth.type "oauth2"', () => {
    expect(() => createRcpClient({ auth: { type: "oauth2" } })).toThrow(RcpAuthNotImplementedError);
  });
});

describe("discover", () => {
  it("fetches, validates, and returns tools, applying auth + injected headers", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer secret123");
      expect((init?.headers as Record<string, string>)["X-Trace"]).toBe("abc");
      return jsonResponse({
        rcpVersion: "0.1",
        tools: [
          {
            name: "get_weather",
            description: "Get current weather.",
            method: "GET",
            url: "https://api.example.com/weather/{{city}}",
            params: [{ name: "city", type: "string", required: true }],
          },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = createRcpClient({
      auth: { type: "header", secret: "secret123" },
      headers: { "X-Trace": () => "abc" },
    });

    const { manifest, tools } = await client.discover("https://server.example.com/manifest");

    expect(manifest.rcpVersion).toBe("0.1");
    expect(tools).toHaveLength(1);
    expect(tools[0]?.exposedParams).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("strips resolver-bound params from exposedParams", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          rcpVersion: "0.1",
          tools: [
            {
              name: "get_profile",
              description: "Get the current user profile.",
              method: "GET",
              url: "https://api.example.com/users/{{userId}}",
              params: [{ name: "userId", type: "string", required: true }],
            },
          ],
        }),
      ),
    );

    const client = createRcpClient({ resolvers: { userId: () => "u_1" } });
    const { tools } = await client.discover("https://server.example.com/manifest");

    expect(tools[0]?.params).toHaveLength(1); // still on the raw tool
    expect(tools[0]?.exposedParams).toHaveLength(0); // hidden from the model
  });

  it("rejects a manifest with an unsupported rcpVersion", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ rcpVersion: "99.0", tools: [] })),
    );

    const client = createRcpClient();
    await expect(client.discover("https://server.example.com/manifest")).rejects.toThrow(
      RcpVersionMismatchError,
    );
  });

  it("rejects a manifest that fails schema validation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ rcpVersion: "0.1", tools: [{ name: "bad" }] })),
    );

    const client = createRcpClient();
    await expect(client.discover("https://server.example.com/manifest")).rejects.toThrow(
      RcpManifestValidationError,
    );
  });

  it("throws on a non-2xx manifest response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({}, 401)),
    );
    const client = createRcpClient();
    await expect(client.discover("https://server.example.com/manifest")).rejects.toThrow(/401/);
  });
});

describe("call", () => {
  const weatherTool: RcpTool = {
    name: "get_weather",
    description: "Get current weather.",
    method: "GET",
    url: "https://api.example.com/weather/{{city}}",
    params: [{ name: "city", type: "string", required: true }],
    queryParams: undefined,
    headers: undefined,
    responseMappings: { temp: "@data.temp" },
  };

  it("renders the url from agentArgs and applies responseMappings", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe("https://api.example.com/weather/paris");
      return jsonResponse({ data: { temp: 21 } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = createRcpClient();
    const result = await client.call(weatherTool, { city: "paris" });

    expect(result.ok).toBe(true);
    expect(result.mapped).toEqual({ temp: 21 });
  });

  it("fills a resolver-bound token from ctx, never from agentArgs", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe("https://api.example.com/users/u_42");
      return jsonResponse({ ok: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    const identityTool: RcpTool = {
      name: "get_profile",
      description: "Get profile.",
      method: "GET",
      url: "https://api.example.com/users/{{userId}}",
      params: [{ name: "userId", type: "string", required: true }],
    };

    const client = createRcpClient({
      resolvers: { userId: (ctx) => (ctx as { userId: string }).userId },
    });
    // agentArgs tries to spoof a different userId — the resolver must win.
    await client.call(identityTool, { userId: "spoofed" }, { userId: "u_42" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws RcpResolverError when a resolver produces no value", async () => {
    const client = createRcpClient({ resolvers: { userId: () => undefined } });
    const identityTool: RcpTool = {
      name: "get_profile",
      description: "Get profile.",
      method: "GET",
      url: "https://api.example.com/users/{{userId}}",
      params: [{ name: "userId", type: "string", required: true }],
    };

    await expect(client.call(identityTool, {}, {})).rejects.toThrow(RcpResolverError);
  });

  it("attaches header-mode auth and injected headers to a tool call", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer secret123");
      expect(headers["X-Trace"]).toBe("abc");
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = createRcpClient({
      auth: { type: "header", secret: "secret123" },
      headers: { "X-Trace": () => "abc" },
    });
    await client.call(weatherTool, { city: "paris" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws RcpToolAuthOverrideNotImplementedError when a tool declares its own auth", async () => {
    const client = createRcpClient();
    const overriddenTool: RcpTool = { ...weatherTool, auth: { type: "none" } };
    await expect(client.call(overriddenTool, { city: "paris" })).rejects.toThrow(
      RcpToolAuthOverrideNotImplementedError,
    );
  });
});

function fakeLogger(): RcpLogger & { messages: string[] } {
  const messages: string[] = [];
  return {
    messages,
    info: (m) => messages.push(`info: ${m}`),
    warn: (m) => messages.push(`warn: ${m}`),
    error: (m) => messages.push(`error: ${m}`),
  };
}

describe("logging", () => {
  it("is silent by default — no logger means nothing is called", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ rcpVersion: "0.1", tools: [] })),
    );
    const client = createRcpClient();
    await client.discover("https://server.example.com/manifest");
    // Nothing to assert on directly (no logger was even provided) — this
    // just proves discover() doesn't require one.
  });

  it("logs discovery events but never the auth secret", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          rcpVersion: "0.1",
          tools: [
            {
              name: "get_profile",
              description: "Get profile.",
              method: "GET",
              url: "https://api.example.com/users/{{userId}}",
              params: [{ name: "userId", type: "string", required: true }],
            },
          ],
        }),
      ),
    );

    const logger = fakeLogger();
    const client = createRcpClient({
      auth: { type: "header", secret: "super-secret-value" },
      resolvers: { userId: () => "u_1" },
      logger,
    });
    await client.discover("https://server.example.com/manifest");

    const joined = logger.messages.join("\n");
    expect(joined).toContain("get_profile");
    expect(joined).toContain("hides 1 resolver-bound param");
    expect(joined).toContain("userId");
    expect(joined).not.toContain("super-secret-value");
  });

  it("logs call events but never headers, body, or resolved values", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ data: { temp: 21 } })),
    );

    const logger = fakeLogger();
    const client = createRcpClient({
      resolvers: { userId: () => "sensitive-user-id-123" },
      logger,
    });
    const identityTool: RcpTool = {
      name: "get_profile",
      description: "Get profile.",
      method: "GET",
      url: "https://api.example.com/users/{{userId}}",
      params: [{ name: "userId", type: "string", required: true }],
    };
    await client.call(identityTool, {}, {});

    const joined = logger.messages.join("\n");
    expect(joined).toContain("get_profile");
    expect(joined).toContain("200");
    expect(joined).not.toContain("sensitive-user-id-123");
  });

  it("logs a warning (not silently) when a call comes back non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({}, 500)),
    );
    const logger = fakeLogger();
    const client = createRcpClient({ logger });
    const tool: RcpTool = {
      name: "get_weather",
      description: "Get current weather.",
      method: "GET",
      url: "https://api.example.com/weather/{{city}}",
      params: [{ name: "city", type: "string", required: true }],
    };
    await client.call(tool, { city: "paris" });

    expect(logger.messages.some((m) => m.startsWith("warn:") && m.includes("500"))).toBe(true);
  });
});

describe("describeManifest", () => {
  it("describes auth and flags resolver-hidden params", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          rcpVersion: "0.1",
          auth: { type: "header", header: "Authorization", scheme: "Bearer" },
          tools: [
            {
              name: "get_profile",
              description: "Get profile.",
              method: "GET",
              url: "https://api.example.com/users/{{userId}}/{{tenantId}}",
              params: [
                { name: "userId", type: "string", required: true, description: "user id" },
                { name: "tenantId", type: "string", required: true },
              ],
            },
          ],
        }),
      ),
    );

    const client = createRcpClient({ resolvers: { userId: () => "u_1" } });
    const { manifest, tools } = await client.discover("https://server.example.com/manifest");
    const description = describeManifest(manifest, tools);

    expect(description).toContain('auth: header "Authorization" (scheme: Bearer)');
    expect(description).toContain("get_profile");
    expect(description).toContain(
      "userId: string, required [resolved by client, hidden from model] — user id",
    );
    expect(description).toContain("tenantId: string, required");
    expect(description).not.toContain("tenantId: string, required [resolved");
  });
});
