import { describe, it, expect, vi } from "vitest";
import {
  rcpToolToOpenAiTool,
  rcpToolsToOpenAiTools,
  loadOpenAiTools,
} from "../src/adapters/openai.js";
import type { DiscoveredTool } from "../src/client.js";

const weatherTool: DiscoveredTool = {
  name: "get_weather",
  description: "Get weather for a city",
  method: "GET",
  url: "https://api.example.com/weather",
  params: [
    { name: "city", type: "string", description: "City name", required: true },
    { name: "units", type: "string", description: "Temperature units", required: false },
  ],
  exposedParams: [
    { name: "city", type: "string", description: "City name", required: true },
    { name: "units", type: "string", description: "Temperature units", required: false },
  ],
};

const identityTool: DiscoveredTool = {
  name: "get_profile",
  description: "Get user profile",
  method: "GET",
  url: "https://api.example.com/profile",
  params: [{ name: "scope", type: "string", description: "Profile scope", required: true }],
  exposedParams: [{ name: "scope", type: "string", description: "Profile scope", required: true }],
};

const noParamsTool: DiscoveredTool = {
  name: "ping",
  description: "Health check",
  method: "GET",
  url: "https://api.example.com/ping",
  params: [],
  exposedParams: [],
};

function fakeRcpClient(discoverResult?: { manifest: unknown; tools: DiscoveredTool[] }) {
  return {
    discover: vi
      .fn()
      .mockResolvedValue(discoverResult ?? { manifest: { rcpVersion: "0.1" }, tools: [] }),
  };
}

// ---------------------------------------------------------------------------
// rcpToolToOpenAiTool
// ---------------------------------------------------------------------------

describe("rcpToolToOpenAiTool", () => {
  it("converts a tool with params", () => {
    const tool = rcpToolToOpenAiTool(weatherTool);

    expect(tool).toEqual({
      type: "function",
      function: {
        name: "get_weather",
        description: "Get weather for a city",
        parameters: {
          type: "object",
          properties: {
            city: { type: "string", description: "City name" },
            units: { type: "string", description: "Temperature units" },
          },
          required: ["city"],
          additionalProperties: false,
        },
      },
    });
  });

  it("converts a tool with no params", () => {
    const tool = rcpToolToOpenAiTool(noParamsTool);

    expect(tool).toEqual({
      type: "function",
      function: {
        name: "ping",
        description: "Health check",
        parameters: {
          type: "object",
          properties: {},
          required: [],
          additionalProperties: false,
        },
      },
    });
  });

  it("applies serverName prefix", () => {
    const tool = rcpToolToOpenAiTool(weatherTool, {
      serverName: "weather",
      prefixToolNameWithServerName: true,
    });
    expect(tool.function.name).toBe("weather__get_weather");
  });

  it("applies additionalToolNamePrefix", () => {
    const tool = rcpToolToOpenAiTool(weatherTool, { additionalToolNamePrefix: "rcp" });
    expect(tool.function.name).toBe("rcp__get_weather");
  });

  it("combines additionalToolNamePrefix and serverName", () => {
    const tool = rcpToolToOpenAiTool(weatherTool, {
      additionalToolNamePrefix: "rcp",
      serverName: "weather",
      prefixToolNameWithServerName: true,
    });
    expect(tool.function.name).toBe("rcp__weather__get_weather");
  });
});

// ---------------------------------------------------------------------------
// rcpToolsToOpenAiTools
// ---------------------------------------------------------------------------

describe("rcpToolsToOpenAiTools", () => {
  it("converts multiple tools", () => {
    const tools = rcpToolsToOpenAiTools([weatherTool, identityTool]);
    expect(tools).toHaveLength(2);
    expect(tools[0]!.function.name).toBe("get_weather");
    expect(tools[1]!.function.name).toBe("get_profile");
  });

  it("returns empty array for empty input", () => {
    expect(rcpToolsToOpenAiTools([])).toEqual([]);
  });

  it("applies naming options to all tools", () => {
    const tools = rcpToolsToOpenAiTools([weatherTool, identityTool], {
      serverName: "api",
      prefixToolNameWithServerName: true,
    });
    expect(tools[0]!.function.name).toBe("api__get_weather");
    expect(tools[1]!.function.name).toBe("api__get_profile");
  });
});

// ---------------------------------------------------------------------------
// loadOpenAiTools
// ---------------------------------------------------------------------------

describe("loadOpenAiTools", () => {
  it("discovers and converts in one call", async () => {
    const client = fakeRcpClient({
      manifest: { rcpVersion: "0.1" },
      tools: [weatherTool, noParamsTool],
    });

    const { tools, discovered } = await loadOpenAiTools("https://example.com/rcp/manifest", client);

    expect(discovered).toHaveLength(2);
    expect(tools).toHaveLength(2);
    expect(tools[0]!.function.name).toBe("get_weather");
    expect(client.discover).toHaveBeenCalledWith("https://example.com/rcp/manifest");
  });

  it("applies naming options", async () => {
    const client = fakeRcpClient({
      manifest: { rcpVersion: "0.1" },
      tools: [weatherTool],
    });

    const { tools } = await loadOpenAiTools("https://example.com/rcp/manifest", client, {
      serverName: "weather",
      prefixToolNameWithServerName: true,
    });

    expect(tools[0]!.function.name).toBe("weather__get_weather");
  });
});
