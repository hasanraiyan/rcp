import { describe, expect, it } from "vitest";
import {
  collectTokenNames,
  extractTokenNames,
  MissingTemplateValueError,
  renderDeep,
  renderRecord,
  renderTemplateString,
} from "../src/templateEngine.js";

describe("extractTokenNames", () => {
  it("finds every distinct token, in order, deduped", () => {
    expect(extractTokenNames("{{a}}-{{b}}-{{a}}")).toEqual(["a", "b"]);
  });

  it("returns [] for a string with no tokens", () => {
    expect(extractTokenNames("no tokens here")).toEqual([]);
  });
});

describe("renderTemplateString", () => {
  it("substitutes a known value", () => {
    expect(renderTemplateString("hello {{name}}", { name: "world" })).toBe("hello world");
  });

  it("renders a missing (but resolved-as-undefined) value as empty string", () => {
    expect(renderTemplateString("id={{id}}", { id: undefined })).toBe("id=");
  });

  it("throws MissingTemplateValueError when the caller never resolved the token at all", () => {
    expect(() => renderTemplateString("id={{id}}", {})).toThrow(MissingTemplateValueError);
  });
});

describe("renderDeep", () => {
  it("renders strings recursively through arrays and objects, leaving other types alone", () => {
    const result = renderDeep(
      { name: "{{name}}", count: 3, tags: ["{{name}}", "static"], nested: { ok: true } },
      { name: "Ada" },
    );
    expect(result).toEqual({
      name: "Ada",
      count: 3,
      tags: ["Ada", "static"],
      nested: { ok: true },
    });
  });
});

describe("renderRecord", () => {
  it("renders every value in a record", () => {
    expect(renderRecord({ q: "{{query}}" }, { query: "cats" })).toEqual({ q: "cats" });
  });

  it("returns {} for undefined input", () => {
    expect(renderRecord(undefined, {})).toEqual({});
  });
});

describe("collectTokenNames", () => {
  it("collects tokens from url, queryParams, headers, and body, deduped", () => {
    const names = collectTokenNames({
      url: "https://api.example.com/{{id}}",
      queryParams: { q: "{{query}}" },
      headers: { "X-Trace": "{{id}}" },
      body: { nested: { value: "{{query}}" } },
    });
    expect(names.sort()).toEqual(["id", "query"]);
  });
});
