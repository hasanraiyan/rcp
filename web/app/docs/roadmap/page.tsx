import type { Metadata } from "next";
import { DocPage } from "@/components/docs/doc-page";
import { Checklist } from "@/components/docs/checklist";

export const metadata: Metadata = {
  title: "Roadmap",
  description:
    "What's actually done vs. what's still open in RCP, across the protocol design, the TypeScript SDK, and what's planned beyond v1.",
  alternates: { canonical: "/docs/roadmap" },
};

export default function RoadmapPage() {
  return (
    <DocPage
      title="Roadmap"
      description="What's actually done vs. what's still open, across the protocol design and the reference SDK. RCP is v0.1, in active design."
    >
      <h2>Protocol (design)</h2>
      <Checklist
        items={[
          {
            done: true,
            text: (
              <>
                <code>GET &lt;manifest-url&gt;</code> →{" "}
                <code>{"{ rcpVersion, auth, tools[] }"}</code> manifest format.
              </>
            ),
          },
          {
            done: true,
            text: "Two roles defined — Client and Server, no third “host” layer, no persistent connection.",
          },
          {
            done: true,
            text: (
              <>
                Auth — three modes specified: <code>none</code>, <code>header</code>,{" "}
                <code>oauth2</code> (same RFC stack MCP&rsquo;s own auth uses).
              </>
            ),
          },
          {
            done: true,
            text: "Resolvers — a client-side-only mechanism for values that must never reach the model.",
          },
          {
            done: true,
            text: "Client-injected headers — attaching headers with no manifest correspondence at all.",
          },
          { done: true, text: "Security & trust principles adapted from MCP’s." },
          {
            done: false,
            text: (
              <>
                <code>oauth2</code> — designed, not implemented by any SDK yet.
              </>
            ),
          },
          {
            done: false,
            text: "Per-tool auth overrides — specified in the schema, but no SDK actually executes it yet.",
          },
          {
            done: false,
            text: (
              <>
                A <code>skills</code>/resources-equivalent primitive — deliberately out of scope for
                v0.1.
              </>
            ),
          },
          {
            done: false,
            text: (
              <>
                Open questions: <code>rcpVersion</code> in the body vs. a header; the default when a
                resolver can&rsquo;t produce a value; a naming convention for commonly-resolved
                params; whether a server ever needs to push a manifest-changed notification.
              </>
            ),
          },
        ]}
      />

      <h2>TypeScript SDK — Client</h2>
      <Checklist
        items={[
          {
            done: true,
            text: (
              <>
                <code>discover()</code> — fetch, schema-validate, version-check, strip
                resolver-bound params.
              </>
            ),
          },
          {
            done: true,
            text: (
              <>
                <code>call()</code> — template rendering, resolver filling, auth + header
                attachment, response mapping.
              </>
            ),
          },
          {
            done: true,
            text: (
              <>
                Auth: <code>none</code>, <code>header</code>.
              </>
            ),
          },
          { done: true, text: "Resolvers." },
          { done: true, text: "Client-injected headers." },
          {
            done: true,
            text: "Pluggable logging (silent by default; never logs secrets, headers, bodies, or resolved values).",
          },
          {
            done: true,
            text: (
              <>
                <code>describeManifest()</code> — human-readable printout of what a server is asking
                for.
              </>
            ),
          },
          {
            done: false,
            text: (
              <>
                <code>oauth2</code> — throws a clear &ldquo;not implemented&rdquo; error rather than
                doing nothing.
              </>
            ),
          },
          {
            done: false,
            text: "Per-tool auth overrides — throws a clear “not implemented” error rather than using the wrong credentials.",
          },
        ]}
      />

      <h2>TypeScript SDK — Server</h2>
      <Checklist
        items={[
          {
            done: true,
            text: (
              <>
                <code>defineTool()</code> + <code>t.arg()</code> — build a manifest tool entry in
                code from a zod schema.
              </>
            ),
          },
          {
            done: true,
            text: (
              <>
                zod → <code>params</code> derivation (type, required, description).
              </>
            ),
          },
        ]}
      />

      <h2>Tooling & quality</h2>
      <Checklist
        items={[
          {
            done: true,
            text: "39 tests passing (schema, template engine, response mapper, client, server).",
          },
          {
            done: true,
            text: (
              <>
                Clean <code>tsc --noEmit</code>, <code>tsup</code> build (ESM + CJS +{" "}
                <code>.d.ts</code>).
              </>
            ),
          },
          {
            done: true,
            text: (
              <>
                End-to-end example (<code>examples/basic</code>) verified working live.
              </>
            ),
          },
          {
            done: true,
            text: (
              <>
                API docs for both entry points (<code>docs/client.md</code>,{" "}
                <code>docs/server.md</code>).
              </>
            ),
          },
          { done: true, text: "Architecture diagrams (root README)." },
          {
            done: true,
            text: (
              <>
                Lint/formatting setup (eslint/prettier) — flat <code>eslint.config.js</code>{" "}
                (typescript-eslint recommended) + <code>.prettierrc.json</code>, wired to{" "}
                <code>lint</code>/<code>format</code>/<code>format:check</code> scripts.
              </>
            ),
          },
          {
            done: true,
            text: (
              <>
                Published to npm —{" "}
                <a
                  href="https://www.npmjs.com/package/rcp-sdk"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  rcp-sdk
                </a>{" "}
                is live.
              </>
            ),
          },
          {
            done: true,
            text: (
              <>
                Pushed to a GitHub remote —{" "}
                <a
                  href="https://github.com/hasanraiyan/rcp"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  hasanraiyan/rcp
                </a>
                .
              </>
            ),
          },
        ]}
      />

      <h2>Examples</h2>
      <Checklist
        items={[
          {
            done: true,
            text: (
              <>
                <code>examples/express</code> — an Express REST API + one route serving an RCP
                manifest via <code>defineTool()</code>. Server-only; no AI/model code.
              </>
            ),
          },
          {
            done: true,
            text: (
              <>
                <code>examples/openai-client</code> — discovers a manifest and runs an OpenAI
                tool-calling loop against it. Client-only; no Express/FastAPI code. Installs{" "}
                <code>rcp-sdk</code> from the real npm package.
              </>
            ),
          },
          {
            done: false,
            text: (
              <>
                Framework adapters (<code>rcp-sdk/adapters/openai</code>, <code>/gemini</code>,{" "}
                <code>/langchain</code>, ...) so the manifest-to-tool-schema conversion currently
                hand-rolled in <code>examples/openai-client</code> doesn&rsquo;t have to be
                re-derived by every consumer — tracked in{" "}
                <a
                  href="https://github.com/hasanraiyan/rcp/issues/1"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  issue #1
                </a>
                .
              </>
            ),
          },
          {
            done: false,
            text: "A Python/FastAPI server example — would double as proof that an RCP server needs no SDK in any language.",
          },
        ]}
      />

      <h2>Beyond v1 — not started, no commitment yet</h2>
      <Checklist
        items={[
          {
            done: false,
            text: (
              <>
                A second-language reference SDK (e.g. <code>python/</code>) — the repo is structured
                to support this, but nothing has been written.
              </>
            ),
          },
          {
            done: false,
            text: (
              <>
                Any tooling around the <code>skills</code>/resources idea, if it turns out to be
                needed.
              </>
            ),
          },
          {
            done: false,
            text: (
              <>
                A CLI (e.g. <code>rcp inspect &lt;url&gt;</code> wrapping{" "}
                <code>describeManifest()</code>) — not planned, just a natural extension if
                it&rsquo;d be useful.
              </>
            ),
          },
        ]}
      />
    </DocPage>
  );
}
