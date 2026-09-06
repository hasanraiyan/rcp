import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import {
  rcpToolToLangChainTool,
  rcpToolsToLangChainTools,
  loadRcpLangChainTools,
  MultiServerRcpClient,
} from "../src/adapters/langchain.js";
import type { DiscoveredTool, CallResult } from "../src/client.js";

/** Cast a DynamicStructuredTool's schema to a ZodObject for shape assertions. */
function schemaShape(tool: DynamicStructuredTool): z.ZodObject<z.ZodRawShape> {
  return tool.schema as unknown as z.ZodObject<z.ZodRawShape>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const weatherTool: DiscoveredTool = {
  name: "get_weather",
  description: "Get current weather.",
  method: "GET",
  url: "https://api.example.com/weather/{{city}}",
  params: [{ name: "city", type: "string", required: true }],
  exposedParams: [{ name: "city", type: "string", required: true }],
  queryParams: undefined,
  headers: undefined,
  responseMappings: { temp: "@data.temp" },
};

const identityTool: DiscoveredTool = {
  name: "get_profile",
  description: "Get user profile.",
  method: "GET",
  url: "https://api.example.com/users/{{userId}}/{{scope}}",
  params: [
    { name: "userId", type: "string", required: true },
    { name: "scope", type: "string", required: false },
  ],
  exposedParams: [{ name: "scope", type: "string", required: false }],
  queryParams: undefined,
  headers: undefined,
};

const noParamsTool: DiscoveredTool = {
  name: "ping",
  description: "Health check.",
  method: "GET",
  url: "https://api.example.com/ping",
  params: [],
  exposedParams: [],
  queryParams: undefined,
  headers: undefined,
};

function fakeCallResult(overrides?: Partial<CallResult>): CallResult {
  return {
    status: 200,
    ok: true,
    raw: { data: { temp: 21 } },
    mapped: { temp: 21 },
    ...overrides,
  };
}

function fakeRcpClient(overrides?: {
  callResult?: CallResult;
  discoverResult?: { manifest: unknown; tools: DiscoveredTool[] };
}) {
  const callResult = overrides?.callResult ?? fakeCallResult();
  return {
    discover: vi.fn(
      async (_url: string, _ctx?: unknown) =>
        overrides?.discoverResult ?? {
          manifest: { rcpVersion: "0.1", tools: [] },
          tools: [weatherTool],
        },
    ),
    call: vi.fn(async () => callResult),
  };
}

// ---------------------------------------------------------------------------
// rcpToolToLangChainTool
// ---------------------------------------------------------------------------

describe("rcpToolToLangChainTool", () => {
  it("returns a DynamicStructuredTool", () => {
    const client = fakeRcpClient();
    const tool = rcpToolToLangChainTool(weatherTool, client);
    expect(tool).toBeInstanceOf(DynamicStructuredTool);
  });

  it("preserves name and description", () => {
    const client = fakeRcpClient();
    const tool = rcpToolToLangChainTool(weatherTool, client);
    expect(tool.name).toBe("get_weather");
    expect(tool.description).toBe("Get current weather.");
  });

  it("builds a zod schema from exposedParams", () => {
    const client = fakeRcpClient();
    const tool = rcpToolToLangChainTool(weatherTool, client);
    // Schema should have one required string field
    expect(schemaShape(tool).shape.city).toBeDefined();
  });

  it("optional exposedParams become optional zod fields", () => {
    const client = fakeRcpClient();
    const tool = rcpToolToLangChainTool(identityTool, client);
    // scope is required: false
    expect(schemaShape(tool).shape.scope).toBeDefined();
  });

  it("empty exposedParams produces an empty zod object", () => {
    const client = fakeRcpClient();
    const tool = rcpToolToLangChainTool(noParamsTool, client);
    expect(Object.keys(schemaShape(tool).shape)).toHaveLength(0);
  });

  it("calls rcpClient.call with input args", async () => {
    const client = fakeRcpClient();
    const tool = rcpToolToLangChainTool(weatherTool, client);
    await tool.invoke({ city: "paris" });
    expect(client.call).toHaveBeenCalledTimes(1);
    expect(client.call).toHaveBeenCalledWith(weatherTool, { city: "paris" }, undefined);
  });

  it("applies responseMappings via rcp.call", async () => {
    const client = fakeRcpClient({ callResult: fakeCallResult({ mapped: { temp: 21 } }) });
    const tool = rcpToolToLangChainTool(weatherTool, client);
    const result = await tool.invoke({ city: "london" });
    expect(result).toBe('{"temp":21}');
  });

  it("stringifies mapped results for consistent ToolMessage", async () => {
    const client = fakeRcpClient({
      callResult: fakeCallResult({ mapped: "plain text response" }),
    });
    const tool = rcpToolToLangChainTool(weatherTool, client);
    const result = await tool.invoke({ city: "berlin" });
    expect(result).toBe("plain text response");
  });

  it("handles null mapped result by falling back to raw text", async () => {
    const client = fakeRcpClient({
      callResult: fakeCallResult({ mapped: null, raw: "no data" }),
    });
    const tool = rcpToolToLangChainTool(weatherTool, client);
    const result = await tool.invoke({ city: "rome" });
    expect(result).toBe("no data");
  });

  it("handles undefined mapped result by falling back to raw text", async () => {
    const client = fakeRcpClient({
      callResult: fakeCallResult({ mapped: undefined, raw: "fallback" }),
    });
    const tool = rcpToolToLangChainTool(weatherTool, client);
    const result = await tool.invoke({ city: "paris" });
    expect(result).toBe("fallback");
  });

  it("returns error string instead of throwing on rcp.call failure", async () => {
    const client = fakeRcpClient();
    client.call.mockRejectedValue(new Error("Network timeout"));
    const tool = rcpToolToLangChainTool(weatherTool, client);
    const result = await tool.invoke({ city: "paris" });
    expect(result).toContain("RCP tool");
    expect(result).toContain("get_weather");
    expect(result).toContain("Network timeout");
  });

  it("handles non-Error thrown by rcp.call", async () => {
    const client = fakeRcpClient();
    client.call.mockRejectedValue("string error");
    const tool = rcpToolToLangChainTool(weatherTool, client);
    const result = await tool.invoke({ city: "paris" });
    expect(result).toContain("string error");
  });

  it("returns empty string for null/undefined mapped + null/undefined raw", async () => {
    const client = fakeRcpClient({
      callResult: fakeCallResult({ mapped: null, raw: null }),
    });
    const tool = rcpToolToLangChainTool(weatherTool, client);
    const result = await tool.invoke({ city: "paris" });
    expect(typeof result).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// Naming options
// ---------------------------------------------------------------------------

describe("naming options", () => {
  it("prefixToolNameWithServerName prefixes tool name", () => {
    const client = fakeRcpClient();
    const tool = rcpToolToLangChainTool(weatherTool, client, {
      serverName: "weather",
      prefixToolNameWithServerName: true,
    });
    expect(tool.name).toBe("weather__get_weather");
  });

  it("additionalToolNamePrefix adds prefix", () => {
    const client = fakeRcpClient();
    const tool = rcpToolToLangChainTool(weatherTool, client, {
      additionalToolNamePrefix: "rcp",
    });
    expect(tool.name).toBe("rcp__get_weather");
  });

  it("both prefixes combine correctly", () => {
    const client = fakeRcpClient();
    const tool = rcpToolToLangChainTool(weatherTool, client, {
      serverName: "weather",
      prefixToolNameWithServerName: true,
      additionalToolNamePrefix: "rcp",
    });
    expect(tool.name).toBe("rcp__weather__get_weather");
  });

  it("prefixToolNameWithServerName without serverName does nothing", () => {
    const client = fakeRcpClient();
    const tool = rcpToolToLangChainTool(weatherTool, client, {
      prefixToolNameWithServerName: true,
    });
    expect(tool.name).toBe("get_weather");
  });
});

// ---------------------------------------------------------------------------
// Context / resolvers
// ---------------------------------------------------------------------------

describe("context resolution", () => {
  it("passes static context value to rcp.call", async () => {
    const client = fakeRcpClient();
    const tool = rcpToolToLangChainTool(identityTool, client, {
      context: { userId: "u_1" },
    });
    await tool.invoke({ scope: "profile" });
    expect(client.call).toHaveBeenCalledWith(identityTool, { scope: "profile" }, { userId: "u_1" });
  });

  it("calls a zero-arg function for context per invocation", async () => {
    const client = fakeRcpClient();
    let callCount = 0;
    const tool = rcpToolToLangChainTool(identityTool, client, {
      context: () => ({ userId: `u_${++callCount}` }),
    });
    await tool.invoke({ scope: "a" });
    await tool.invoke({ scope: "b" });
    expect(client.call).toHaveBeenCalledTimes(2);
    const calls = client.call.mock.calls as unknown[][];
    expect(calls[0]?.[2]).toEqual({ userId: "u_1" });
    expect(calls[1]?.[2]).toEqual({ userId: "u_2" });
  });

  it("async context function is awaited", async () => {
    const client = fakeRcpClient();
    const tool = rcpToolToLangChainTool(identityTool, client, {
      context: async () => ({ userId: "async_user" }),
    });
    await tool.invoke({ scope: "x" });
    expect(client.call).toHaveBeenCalledWith(
      identityTool,
      { scope: "x" },
      { userId: "async_user" },
    );
  });

  it("getContext takes precedence over context", async () => {
    const client = fakeRcpClient();
    const tool = rcpToolToLangChainTool(identityTool, client, {
      context: { userId: "old" },
      getContext: { userId: "new" },
    });
    await tool.invoke({ scope: "x" });
    expect(client.call).toHaveBeenCalledWith(identityTool, { scope: "x" }, { userId: "new" });
  });

  it("undefined context results in undefined ctx", async () => {
    const client = fakeRcpClient();
    const tool = rcpToolToLangChainTool(identityTool, client);
    await tool.invoke({ scope: "x" });
    expect(client.call).toHaveBeenCalledWith(identityTool, { scope: "x" }, undefined);
  });
});

// ---------------------------------------------------------------------------
// mapResult
// ---------------------------------------------------------------------------

describe("mapResult", () => {
  it("custom mapResult overrides default serialization", async () => {
    const client = fakeRcpClient({ callResult: fakeCallResult({ mapped: { temp: 21 } }) });
    const tool = rcpToolToLangChainTool(weatherTool, client, {
      mapResult: (result) => `Custom: ${JSON.stringify(result.mapped)}`,
    });
    const result = await tool.invoke({ city: "paris" });
    expect(result).toBe('Custom: {"temp":21}');
  });

  it("async mapResult is awaited", async () => {
    const client = fakeRcpClient({ callResult: fakeCallResult({ mapped: { temp: 21 } }) });
    const tool = rcpToolToLangChainTool(weatherTool, client, {
      mapResult: async (result) => `Async: ${JSON.stringify(result.mapped)}`,
    });
    const result = await tool.invoke({ city: "paris" });
    expect(result).toBe('Async: {"temp":21}');
  });
});

// ---------------------------------------------------------------------------
// rcpToolsToLangChainTools
// ---------------------------------------------------------------------------

describe("rcpToolsToLangChainTools", () => {
  it("converts multiple tools at once", () => {
    const client = fakeRcpClient();
    const tools = rcpToolsToLangChainTools([weatherTool, identityTool, noParamsTool], client);
    expect(tools).toHaveLength(3);
    expect(tools.map((t) => t.name)).toEqual(["get_weather", "get_profile", "ping"]);
  });

  it("shares naming options across all tools", () => {
    const client = fakeRcpClient();
    const tools = rcpToolsToLangChainTools([weatherTool, identityTool], client, {
      serverName: "api",
      prefixToolNameWithServerName: true,
    });
    expect(tools[0]!.name).toBe("api__get_weather");
    expect(tools[1]!.name).toBe("api__get_profile");
  });

  it("returns empty array for empty input", () => {
    const client = fakeRcpClient();
    const tools = rcpToolsToLangChainTools([], client);
    expect(tools).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// loadRcpLangChainTools
// ---------------------------------------------------------------------------

describe("loadRcpLangChainTools", () => {
  it("discovers and converts in one call", async () => {
    const client = fakeRcpClient({
      discoverResult: { manifest: { rcpVersion: "0.1" }, tools: [weatherTool, noParamsTool] },
    });
    const tools = await loadRcpLangChainTools("https://example.com/manifest", client);
    expect(tools).toHaveLength(2);
    expect(client.discover).toHaveBeenCalledWith("https://example.com/manifest", undefined);
  });

  it("passes ctx to discover", async () => {
    const client = fakeRcpClient({
      discoverResult: { manifest: { rcpVersion: "0.1" }, tools: [weatherTool] },
    });
    await loadRcpLangChainTools("https://example.com/manifest", client, {
      ctx: { userId: "u_1" },
    });
    expect(client.discover).toHaveBeenCalledWith("https://example.com/manifest", { userId: "u_1" });
  });

  it("applies naming options", async () => {
    const client = fakeRcpClient({
      discoverResult: { manifest: { rcpVersion: "0.1" }, tools: [weatherTool] },
    });
    const tools = await loadRcpLangChainTools("https://example.com/manifest", client, {
      serverName: "weather",
      prefixToolNameWithServerName: true,
    });
    expect(tools[0]!.name).toBe("weather__get_weather");
  });
});

// ---------------------------------------------------------------------------
// MultiServerRcpClient
// ---------------------------------------------------------------------------

describe("MultiServerRcpClient", () => {
  it("throws when no servers configured", () => {
    expect(() => new MultiServerRcpClient({ servers: {} })).toThrow(
      "MultiServerRcpClient: no servers configured",
    );
  });

  it("getTools discovers all servers and returns flat array", async () => {
    const client1 = fakeRcpClient({
      discoverResult: { manifest: { rcpVersion: "0.1" }, tools: [weatherTool] },
    });
    const client2 = fakeRcpClient({
      discoverResult: { manifest: { rcpVersion: "0.1" }, tools: [identityTool] },
    });
    const multi = new MultiServerRcpClient({
      servers: {
        weather: { manifestUrl: "https://weather.example.com/rcp/manifest", client: client1 },
        users: { manifestUrl: "https://users.example.com/rcp/manifest", client: client2 },
      },
    });
    const tools = await multi.getTools();
    expect(tools).toHaveLength(2);
    expect(tools.map((t) => t.name)).toEqual(["get_weather", "get_profile"]);
    expect(client1.discover).toHaveBeenCalledTimes(1);
    expect(client2.discover).toHaveBeenCalledTimes(1);
  });

  it("getToolsForServer discovers only that server", async () => {
    const client1 = fakeRcpClient({
      discoverResult: { manifest: { rcpVersion: "0.1" }, tools: [weatherTool] },
    });
    const client2 = fakeRcpClient({
      discoverResult: { manifest: { rcpVersion: "0.1" }, tools: [identityTool] },
    });
    const multi = new MultiServerRcpClient({
      servers: {
        weather: { manifestUrl: "https://weather.example.com/rcp/manifest", client: client1 },
        users: { manifestUrl: "https://users.example.com/rcp/manifest", client: client2 },
      },
    });
    const tools = await multi.getToolsForServer("weather");
    expect(tools).toHaveLength(1);
    expect(tools[0]!.name).toBe("get_weather");
    expect(client1.discover).toHaveBeenCalledTimes(1);
    expect(client2.discover).not.toHaveBeenCalled();
  });

  it("caches discovery results per server", async () => {
    const client = fakeRcpClient({
      discoverResult: { manifest: { rcpVersion: "0.1" }, tools: [weatherTool] },
    });
    const multi = new MultiServerRcpClient({
      servers: {
        weather: { manifestUrl: "https://weather.example.com/rcp/manifest", client },
      },
    });
    await multi.getTools();
    await multi.getTools();
    await multi.getTools();
    expect(client.discover).toHaveBeenCalledTimes(1); // only one fetch
  });

  it("invalidateCache forces re-discovery", async () => {
    const client = fakeRcpClient({
      discoverResult: { manifest: { rcpVersion: "0.1" }, tools: [weatherTool] },
    });
    const multi = new MultiServerRcpClient({
      servers: {
        weather: { manifestUrl: "https://weather.example.com/rcp/manifest", client },
      },
    });
    await multi.getTools();
    multi.invalidateCache("weather");
    await multi.getTools();
    expect(client.discover).toHaveBeenCalledTimes(2);
  });

  it("invalidateCache without args clears all", async () => {
    const client1 = fakeRcpClient({
      discoverResult: { manifest: { rcpVersion: "0.1" }, tools: [weatherTool] },
    });
    const client2 = fakeRcpClient({
      discoverResult: { manifest: { rcpVersion: "0.1" }, tools: [identityTool] },
    });
    const multi = new MultiServerRcpClient({
      servers: {
        weather: { manifestUrl: "https://weather.example.com/rcp/manifest", client: client1 },
        users: { manifestUrl: "https://users.example.com/rcp/manifest", client: client2 },
      },
    });
    await multi.getTools();
    multi.invalidateCache();
    await multi.getTools();
    expect(client1.discover).toHaveBeenCalledTimes(2);
    expect(client2.discover).toHaveBeenCalledTimes(2);
  });

  it("getClient returns the underlying RCP client", () => {
    const client = fakeRcpClient();
    const multi = new MultiServerRcpClient({
      servers: {
        weather: { manifestUrl: "https://weather.example.com/rcp/manifest", client },
      },
    });
    expect(multi.getClient("weather")).toBe(client);
    expect(multi.getClient("nonexistent")).toBeUndefined();
  });

  it("close() is a no-op (RCP has no persistent connection)", async () => {
    const client = fakeRcpClient();
    const multi = new MultiServerRcpClient({
      servers: {
        weather: { manifestUrl: "https://weather.example.com/rcp/manifest", client },
      },
    });
    await expect(multi.close()).resolves.toBeUndefined();
  });

  it("prefixToolNameWithServerName prefixes all tools", async () => {
    const client1 = fakeRcpClient({
      discoverResult: { manifest: { rcpVersion: "0.1" }, tools: [weatherTool] },
    });
    const client2 = fakeRcpClient({
      discoverResult: { manifest: { rcpVersion: "0.1" }, tools: [identityTool] },
    });
    const multi = new MultiServerRcpClient({
      servers: {
        weather: { manifestUrl: "https://weather.example.com/rcp/manifest", client: client1 },
        users: { manifestUrl: "https://users.example.com/rcp/manifest", client: client2 },
      },
      prefixToolNameWithServerName: true,
    });
    const tools = await multi.getTools();
    expect(tools.map((t) => t.name)).toEqual(["weather__get_weather", "users__get_profile"]);
  });

  it("per-call getContextForServer overrides shared context", async () => {
    const client1 = fakeRcpClient({
      discoverResult: { manifest: { rcpVersion: "0.1" }, tools: [weatherTool] },
    });
    const client2 = fakeRcpClient({
      discoverResult: { manifest: { rcpVersion: "0.1" }, tools: [identityTool] },
    });
    const multi = new MultiServerRcpClient({
      servers: {
        weather: { manifestUrl: "https://weather.example.com/rcp/manifest", client: client1 },
        users: { manifestUrl: "https://users.example.com/rcp/manifest", client: client2 },
      },
    });
    const tools = await multi.getTools([], {
      getContextForServer: {
        weather: { from: "weatherCtx" },
        users: { from: "usersCtx" },
      },
    });
    // Verify each tool gets the right context when invoked
    await tools[0]!.invoke({ city: "paris" });
    await tools[1]!.invoke({ scope: "profile" });
    expect(client1.call).toHaveBeenCalledWith(
      weatherTool,
      { city: "paris" },
      { from: "weatherCtx" },
    );
    expect(client2.call).toHaveBeenCalledWith(
      identityTool,
      { scope: "profile" },
      { from: "usersCtx" },
    );
  });

  it("throwOnLoadError: false skips failed servers", async () => {
    const goodClient = fakeRcpClient({
      discoverResult: { manifest: { rcpVersion: "0.1" }, tools: [weatherTool] },
    });
    const badClient = fakeRcpClient();
    badClient.discover.mockRejectedValue(new Error("manifest not found"));
    const multi = new MultiServerRcpClient({
      servers: {
        good: { manifestUrl: "https://good.example.com/rcp/manifest", client: goodClient },
        bad: { manifestUrl: "https://bad.example.com/rcp/manifest", client: badClient },
      },
      throwOnLoadError: false,
    });
    const tools = await multi.getTools();
    expect(tools).toHaveLength(1);
    expect(tools[0]!.name).toBe("get_weather");
  });

  it("throwOnLoadError: true throws on failed discovery", async () => {
    const badClient = fakeRcpClient();
    badClient.discover.mockRejectedValue(new Error("manifest not found"));
    const multi = new MultiServerRcpClient({
      servers: {
        bad: { manifestUrl: "https://bad.example.com/rcp/manifest", client: badClient },
      },
    });
    await expect(multi.getTools()).rejects.toThrow("manifest not found");
  });

  it("creates clients from clientOptions when no explicit client", async () => {
    // This tests the createRcpClient integration path.
    // We can't easily mock the createRcpClient import, so we verify
    // the constructor doesn't throw with valid clientOptions shape.
    const multi = new MultiServerRcpClient({
      servers: {
        test: {
          manifestUrl: "https://test.example.com/rcp/manifest",
          clientOptions: { auth: { type: "none" } },
        },
      },
    });
    expect(multi.getClient("test")).toBeDefined();
  });
});
