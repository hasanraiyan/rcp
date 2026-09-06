import { describe, it, expect, vi } from "vitest";
import {
  rcpToolToGeminiInteractionsTool,
  rcpToolsToGeminiInteractionsTools,
  rcpToolToGeminiFunctionDeclaration,
  rcpToolsToGeminiClassicTools,
  loadGeminiTools,
} from "../src/adapters/gemini.js";
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
// rcpToolToGeminiInteractionsTool
// ---------------------------------------------------------------------------

describe("rcpToolToGeminiInteractionsTool", () => {
  it("converts a tool with params", () => {
    const tool = rcpToolToGeminiInteractionsTool(weatherTool);

    expect(tool).toEqual({
      type: "function",
      name: "get_weather",
      description: "Get weather for a city",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name" },
          units: { type: "string", description: "Temperature units" },
        },
        required: ["city"],
      },
    });
  });

  it("converts a tool with no params", () => {
    const tool = rcpToolToGeminiInteractionsTool(noParamsTool);

    expect(tool).toEqual({
      type: "function",
      name: "ping",
      description: "Health check",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    });
  });

  it("applies serverName prefix", () => {
    const tool = rcpToolToGeminiInteractionsTool(weatherTool, {
      serverName: "weather",
      prefixToolNameWithServerName: true,
    });
    expect(tool.name).toBe("weather__get_weather");
  });

  it("applies additionalToolNamePrefix", () => {
    const tool = rcpToolToGeminiInteractionsTool(weatherTool, {
      additionalToolNamePrefix: "rcp",
    });
    expect(tool.name).toBe("rcp__get_weather");
  });
});

// ---------------------------------------------------------------------------
// rcpToolsToGeminiInteractionsTools
// ---------------------------------------------------------------------------

describe("rcpToolsToGeminiInteractionsTools", () => {
  it("converts multiple tools", () => {
    const tools = rcpToolsToGeminiInteractionsTools([weatherTool, identityTool]);
    expect(tools).toHaveLength(2);
    expect(tools[0]!.name).toBe("get_weather");
    expect(tools[1]!.name).toBe("get_profile");
  });

  it("returns empty array for empty input", () => {
    expect(rcpToolsToGeminiInteractionsTools([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// rcpToolToGeminiFunctionDeclaration
// ---------------------------------------------------------------------------

describe("rcpToolToGeminiFunctionDeclaration", () => {
  it("converts to classic format", () => {
    const decl = rcpToolToGeminiFunctionDeclaration(weatherTool);

    expect(decl).toEqual({
      name: "get_weather",
      description: "Get weather for a city",
      parametersJsonSchema: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name" },
          units: { type: "string", description: "Temperature units" },
        },
        required: ["city"],
      },
    });
  });

  it("applies serverName prefix", () => {
    const decl = rcpToolToGeminiFunctionDeclaration(weatherTool, {
      serverName: "weather",
      prefixToolNameWithServerName: true,
    });
    expect(decl.name).toBe("weather__get_weather");
  });
});

// ---------------------------------------------------------------------------
// rcpToolsToGeminiClassicTools
// ---------------------------------------------------------------------------

describe("rcpToolsToGeminiClassicTools", () => {
  it("wraps in functionDeclarations array", () => {
    const tools = rcpToolsToGeminiClassicTools([weatherTool, identityTool]);

    expect(tools).toHaveLength(1);
    expect(tools[0]!.functionDeclarations).toHaveLength(2);
    expect(tools[0]!.functionDeclarations[0]!.name).toBe("get_weather");
    expect(tools[0]!.functionDeclarations[1]!.name).toBe("get_profile");
  });

  it("returns empty declarations for empty input", () => {
    const tools = rcpToolsToGeminiClassicTools([]);
    expect(tools).toHaveLength(1);
    expect(tools[0]!.functionDeclarations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// loadGeminiTools
// ---------------------------------------------------------------------------

describe("loadGeminiTools", () => {
  it("discovers and converts in one call", async () => {
    const client = fakeRcpClient({
      manifest: { rcpVersion: "0.1" },
      tools: [weatherTool, noParamsTool],
    });

    const { interactionsTools, classicTools, discovered } = await loadGeminiTools(
      "https://example.com/rcp/manifest",
      client,
    );

    expect(discovered).toHaveLength(2);
    expect(interactionsTools).toHaveLength(2);
    expect(classicTools).toHaveLength(1);
    expect(classicTools[0]!.functionDeclarations).toHaveLength(2);
    expect(client.discover).toHaveBeenCalledWith("https://example.com/rcp/manifest");
  });

  it("applies naming options", async () => {
    const client = fakeRcpClient({
      manifest: { rcpVersion: "0.1" },
      tools: [weatherTool],
    });

    const { interactionsTools } = await loadGeminiTools(
      "https://example.com/rcp/manifest",
      client,
      { serverName: "weather", prefixToolNameWithServerName: true },
    );

    expect(interactionsTools[0]!.name).toBe("weather__get_weather");
  });
});
