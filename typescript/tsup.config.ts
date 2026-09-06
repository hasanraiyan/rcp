import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/client.ts",
    "src/server.ts",
    "src/adapters/langchain.ts",
    "src/adapters/openai.ts",
    "src/adapters/gemini.ts",
  ],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  platform: "node",
  external: ["@langchain/core", "@langchain/core/tools", "@langchain/core/runnables", "langchain"],
});
