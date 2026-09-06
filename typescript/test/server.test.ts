import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineTool } from "../src/server.js";
import { RcpToolSchema } from "../src/schema.js";

describe("defineTool", () => {
  it("builds a tool with no args", () => {
    const tool = defineTool({
      name: "get_status",
      description: "Returns service status.",
      method: "GET",
      url: "https://api.example.com/status",
    });

    expect(RcpToolSchema.safeParse(tool).success).toBe(true);
    expect(tool.params).toEqual([]);
    expect(tool.url).toBe("https://api.example.com/status");
  });

  it("derives params from a zod args schema, including type/required/description", () => {
    const tool = defineTool({
      name: "search",
      description: "Search something.",
      method: "GET",
      args: z.object({
        query: z.string().describe("Free-text search term"),
        limit: z.number().optional(),
      }),
      url: "https://api.example.com/search",
      queryParams: {
        q: (t) => t.arg("query"),
        limit: (t) => t.arg("limit"),
      },
    });

    expect(RcpToolSchema.safeParse(tool).success).toBe(true);
    expect(tool.queryParams).toEqual({ q: "{{query}}", limit: "{{limit}}" });

    const query = tool.params.find((p) => p.name === "query");
    expect(query).toEqual({
      name: "query",
      type: "string",
      required: true,
      description: "Free-text search term",
    });

    const limit = tool.params.find((p) => p.name === "limit");
    expect(limit).toEqual({ name: "limit", type: "number", required: false });
  });

  it("supports a url callback and a body callback using t.arg", () => {
    const tool = defineTool({
      name: "create_note",
      description: "Create a note.",
      method: "POST",
      args: z.object({ title: z.string(), body: z.string() }),
      url: "https://api.example.com/notes",
      body: (t) => ({ title: t.arg("title"), body: t.arg("body") }),
    });

    expect(tool.body).toEqual({ title: "{{title}}", body: "{{body}}" });
  });

  it("detects boolean args", () => {
    const tool = defineTool({
      name: "toggle",
      description: "Toggle something.",
      method: "POST",
      args: z.object({ enabled: z.boolean() }),
      url: "https://api.example.com/toggle",
    });
    expect(tool.params[0]).toEqual({ name: "enabled", type: "boolean", required: true });
  });
});
