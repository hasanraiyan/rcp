import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runCli } from "../src/cli.js";

const sampleOpenApi = {
  openapi: "3.0.0",
  info: { title: "CLI Test API", version: "1.0.0" },
  paths: {
    "/users": {
      get: {
        operationId: "get_users",
        summary: "Get users",
      },
    },
  },
};

describe("rcp cli", () => {
  it("prints usage when no command or openapi command missing arguments", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await runCli([]);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Usage: rcp openapi"));

    await runCli(["openapi"]);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("--in (-i) is required"));

    consoleSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("converts openapi file and outputs manifest JSON to stdout", async () => {
    const tmpDir = os.tmpdir();
    const specPath = path.join(tmpDir, `test-spec-${Date.now()}.json`);
    fs.writeFileSync(specPath, JSON.stringify(sampleOpenApi), "utf-8");

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runCli(["openapi", "--in", specPath]);

    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls.find((call) => call[0].includes("get_users"));
    expect(output).toBeDefined();

    fs.unlinkSync(specPath);
    consoleSpy.mockRestore();
  });

  it("converts openapi file and writes manifest JSON to file", async () => {
    const tmpDir = os.tmpdir();
    const specPath = path.join(tmpDir, `test-spec-${Date.now()}.json`);
    const outPath = path.join(tmpDir, `test-manifest-${Date.now()}.json`);

    fs.writeFileSync(specPath, JSON.stringify(sampleOpenApi), "utf-8");

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await runCli(["openapi", "--in", specPath, "--out", outPath]);

    expect(fs.existsSync(outPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    expect(content.rcpVersion).toBe("0.1");
    expect(content.tools[0].name).toBe("get_users");

    fs.unlinkSync(specPath);
    fs.unlinkSync(outPath);
    consoleSpy.mockRestore();
  });
});
