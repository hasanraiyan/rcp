import fs from "node:fs";
import path from "node:path";
import { openapiToRcp } from "./openapi.js";

function parseArgs(args: string[]) {
  const options: {
    command?: string;
    input?: string;
    output?: string;
    include: string[];
    exclude: string[];
    resolvers: Record<string, string>;
  } = {
    include: [],
    exclude: [],
    resolvers: {},
  };

  let i = 0;
  if (args[0] && !args[0].startsWith("-")) {
    options.command = args[0];
    i = 1;
  }

  for (; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--in" || arg === "-i") {
      options.input = args[++i];
    } else if (arg === "--out" || arg === "-o") {
      options.output = args[++i];
    } else if (arg === "--include") {
      const val = args[++i];
      if (val) options.include.push(...val.split(",").map((s) => s.trim()));
    } else if (arg === "--exclude") {
      const val = args[++i];
      if (val) options.exclude.push(...val.split(",").map((s) => s.trim()));
    } else if (arg === "--resolvers") {
      const val = args[++i];
      if (val) {
        for (const item of val.split(",")) {
          const [k, v] = item.split("=").map((s) => s.trim());
          if (k) options.resolvers[k] = v || "true";
        }
      }
    }
  }

  return options;
}

export async function runCli(args: string[] = process.argv.slice(2)) {
  const parsed = parseArgs(args);

  if (parsed.command !== "openapi") {
    console.log("Usage: rcp openapi --in <openapi.json|url> [--out <manifest.json>] [--include <patterns>] [--exclude <patterns>]");
    return;
  }

  if (!parsed.input) {
    console.error("Error: --in (-i) is required for 'rcp openapi'");
    process.exitCode = 1;
    return;
  }

  try {
    const mockResolvers: Record<string, () => unknown> = {};
    for (const key of Object.keys(parsed.resolvers)) {
      mockResolvers[key] = () => true;
    }

    const result = await openapiToRcp(parsed.input, {
      include: parsed.include.length > 0 ? parsed.include : undefined,
      exclude: parsed.exclude.length > 0 ? parsed.exclude : undefined,
      resolvers: mockResolvers,
    });

    const jsonText = JSON.stringify(result.manifest, null, 2);

    if (parsed.output) {
      const outPath = path.resolve(process.cwd(), parsed.output);
      fs.writeFileSync(outPath, jsonText, "utf-8");
      console.log(`RCP manifest successfully written to ${outPath}`);
    } else {
      console.log(jsonText);
    }
  } catch (err) {
    console.error("Failed to generate RCP manifest from OpenAPI:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  }
}

// Only auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("rcp.js")) {
  runCli();
}
