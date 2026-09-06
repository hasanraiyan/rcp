import type { Metadata } from "next";
import { DocPage } from "@/components/docs/doc-page";
import { CodeBlock, Callout } from "@/components/docs/code-block";

export const metadata: Metadata = {
  title: "Server — rcp-sdk/server",
  description:
    "API reference for defineTool(): options, t.arg(), and how a zod args schema maps to manifest params.",
  alternates: { canonical: "/docs/sdk/server" },
};

export default function ServerSdkPage() {
  return (
    <DocPage
      title="Server — rcp-sdk/server"
      description="For whoever is exposing their own REST endpoints as tools. Builds a manifest tool entry in code instead of hand-writing the JSON shape."
    >
      <CodeBlock lang="typescript" code={`import { defineTool } from 'rcp-sdk/server';`} />
      <p>
        <code>defineTool()</code> never touches the network — it returns a plain tool object.
        Serving it is up to you: collect your tools into an array and return{" "}
        <code>{"{ rcpVersion: '0.1', auth, tools }"}</code> from whatever route your server already
        has.
      </p>

      <h2>defineTool(options)</h2>
      <CodeBlock
        lang="typescript"
        code={`import { z } from 'zod';

const getWeather = defineTool({
  name: 'get_weather',
  description: 'Get current weather information for a city.',
  method: 'GET',
  args: z.object({
    city: z.string().describe('City name, e.g. "Paris"'),
  }),
  url: 'https://internal.example.com/weather',
  queryParams: { city: (t) => t.arg('city') },
  responseMappings: { temperatureC: '@temperatureC', conditions: '@conditions' },
});`}
      />

      <h3>Options</h3>
      <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Type</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>name</code>
            </td>
            <td>
              <code>string</code>
            </td>
            <td>Required.</td>
          </tr>
          <tr>
            <td>
              <code>description</code>
            </td>
            <td>
              <code>string</code>
            </td>
            <td>Required. What the model sees when deciding whether to call it.</td>
          </tr>
          <tr>
            <td>
              <code>method</code>
            </td>
            <td>
              <code>{"'GET'|'POST'|'PUT'|'PATCH'|'DELETE'"}</code>
            </td>
            <td>Required.</td>
          </tr>
          <tr>
            <td>
              <code>args</code>
            </td>
            <td>
              a <code>z.object({"{...}"})</code> schema
            </td>
            <td>
              Declares the model-fillable arguments — each field becomes one <code>params</code>{" "}
              entry.
            </td>
          </tr>
          <tr>
            <td>
              <code>url</code>
            </td>
            <td>
              <code>string | (t) =&gt; string</code>
            </td>
            <td>
              Required. The callback form gets <code>t</code>, typed against <code>args</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>queryParams</code> / <code>headers</code>
            </td>
            <td>
              <code>Record&lt;string, string | (t) =&gt; string&gt;</code>
            </td>
            <td></td>
          </tr>
          <tr>
            <td>
              <code>body</code>
            </td>
            <td>
              <code>Record&lt;string, unknown&gt; | (t) =&gt; ...</code>
            </td>
            <td>
              Any string value inside (including nested) may use <code>t.arg(...)</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>responseMappings</code>
            </td>
            <td>
              <code>Record&lt;string, string&gt;</code>
            </td>
            <td>
              <code>{"{ fieldName: '@json.path' }"}</code>. A path that doesn&rsquo;t resolve
              returns <code>undefined</code> for that field rather than failing the call.
            </td>
          </tr>
        </tbody>
      </table>
      </div>

      <h2>t.arg(name)</h2>
      <p>
        Available inside the callback form of <code>url</code>/<code>queryParams</code>/
        <code>headers</code>/<code>body</code>. References one of <code>args</code>&rsquo; own
        fields and expands to the literal string <code>{"{{name}}"}</code> — type-checked against{" "}
        <code>args</code>&rsquo; keys, so a typo is a compile error rather than a silently-broken
        template.
      </p>
      <CodeBlock
        lang="typescript"
        code={`args: z.object({ query: z.string() }),
url: (t) => \`https://api.example.com/search?q=\${t.arg('query')}\`, // -> "...?q={{query}}"`}
      />

      <h2>args → params</h2>
      <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>zod</th>
            <th>Tool param</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>z.string()</code> / <code>z.number()</code> / <code>z.boolean()</code>
            </td>
            <td>
              <code>{"type: 'string'|'number'|'boolean'"}</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>.describe(&apos;...&apos;)</code>
            </td>
            <td>
              <code>description: &apos;...&apos;</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>.optional()</code>
            </td>
            <td>
              <code>required: false</code> (omitted entirely → <code>required: true</code>)
            </td>
          </tr>
        </tbody>
      </table>
      </div>
      <p>
        A type this can&rsquo;t recognize (a wrapped/refined/union field) falls back to{" "}
        <code>&apos;string&apos;</code>.
      </p>

      <Callout>
        <code>defineTool()</code> has no concept of a resolver-bound param, and no way to mark one
        as &ldquo;don&rsquo;t ask the model for this&rdquo; — that decision belongs entirely to
        whoever registers your server as a client. Write a clear <code>description</code> on a param
        like <code>userId</code> so a client operator knows to intercept it. See{" "}
        <a href="/docs/concepts/resolvers">Resolvers</a>.
      </Callout>
    </DocPage>
  );
}
