import type { Metadata } from "next";
import { DocPage } from "@/components/docs/doc-page";
import { CodeBlock } from "@/components/docs/code-block";

export const metadata: Metadata = {
  title: "RCP Manifest Format — JSON Directory of AI Tools",
  description:
    "RCP manifest: GET /manifest returns { rcpVersion, auth, tools[] } — a JSON directory that turns REST endpoints into AI-callable tools. No proxy, no JSON-RPC.",
  keywords: [
    "RCP manifest",
    "REST API manifest",
    "RCP manifest format",
    "JSON manifest AI tools",
    "define REST API for AI",
    "rcpVersion tools auth",
  ],
  alternates: { canonical: "/docs/concepts/manifest" },
};

export default function ManifestPage() {
  const techArticleJsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "RCP Manifest Format — JSON Directory of AI Tools",
    description: "RCP manifest: GET /manifest returns { rcpVersion, auth, tools[] } turning REST endpoints into AI-callable tools.",
    author: { "@type": "Person", name: "Raiyan Hasan", url: "https://hasanraiyan.me" },
    datePublished: "2026-09-06",
    dateModified: "2026-09-06",
    keywords: "RCP manifest, REST API manifest, rcpVersion, JSON manifest",
    mainEntityOfPage: "https://rcp.hasanraiyan.me/docs/concepts/manifest",
  };

  return (
    <DocPage
      title="The manifest"
      description="GET <manifest-url> is the entire discovery surface — a directory of tools, not a proxy for calling them."
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticleJsonLd) }} />
      <CodeBlock
        label="GET /manifest -> 200"
        lang="json"
        code={`{
  "rcpVersion": "0.1",
  "auth": { "type": "none" },
  "tools": [
    {
      "name": "get_learner_profile",
      "description": "Fetches a learner's plan and progress by id.",
      "method": "GET",
      "url": "https://api.example.com/learners/{{learnerId}}/profile",
      "params": [
        { "name": "learnerId", "type": "string", "description": "The learner's id" }
      ],
      "responseMappings": { "name": "@data.name", "progress": "@data.progress.percent" }
    },
    {
      "name": "search_courses",
      "description": "Searches the course catalog by free-text query.",
      "method": "GET",
      "url": "https://api.example.com/courses/search",
      "queryParams": { "q": "{{query}}" },
      "params": [
        { "name": "query", "type": "string", "description": "Free-text search term", "required": true }
      ]
    }
  ]
}`}
      />

      <h2>Tool fields</h2>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Required</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>name</code>
            </td>
            <td>yes</td>
            <td>Unique within this manifest.</td>
          </tr>
          <tr>
            <td>
              <code>description</code>
            </td>
            <td>yes</td>
            <td>What the model sees when deciding whether to call it.</td>
          </tr>
          <tr>
            <td>
              <code>method</code>
            </td>
            <td>yes</td>
            <td>
              <code>{"GET | POST | PUT | PATCH | DELETE"}</code>
            </td>
          </tr>
          <tr>
            <td>
              <code>url</code>
            </td>
            <td>yes</td>
            <td>
              May contain <code>{"{{token}}"}</code> placeholders — see <code>params</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>params</code>
            </td>
            <td>no</td>
            <td>
              Declares each token used in <code>url</code>/<code>queryParams</code>/
              <code>headers</code>/<code>body</code>:{" "}
              <code>{"{ name, type, description, required }"}</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>queryParams</code> / <code>headers</code>
            </td>
            <td>no</td>
            <td>
              Token-templated maps, same substitution rules as <code>url</code>.
            </td>
          </tr>
          <tr>
            <td>
              <code>body</code>
            </td>
            <td>no</td>
            <td>A JSON template; presence implies the request has a JSON body.</td>
          </tr>
          <tr>
            <td>
              <code>auth</code>
            </td>
            <td>no</td>
            <td>Overrides the server-level auth for this one tool. Omitted = inherits it.</td>
          </tr>
          <tr>
            <td>
              <code>responseMappings</code>
            </td>
            <td>no</td>
            <td>
              <code>{'{ fieldName: "@json.path" }'}</code> — reshapes the response before it reaches
              the model.
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Discovery and execution hit different places</h2>
      <p>
        The manifest URL is only ever a directory. A model&rsquo;s tool call goes straight to the
        tool&rsquo;s own <code>url</code> — which can be a completely different host than the
        manifest itself. Fetching the manifest tells a client <em>what exists</em>; it never proxies
        the actual call.
      </p>

      <h2>Versioning</h2>
      <p>
        <code>rcpVersion</code> is a plain string on every manifest response. A client that receives
        a manifest with a version it doesn&rsquo;t understand should refuse to load that
        server&rsquo;s tools rather than guess.
      </p>

      <h2>Related</h2>
      <ul>
        <li>
          <a href="/docs/concepts/resolvers">Resolvers — hide tenant ID from the LLM</a>
        </li>
        <li>
          <a href="/docs/concepts/auth">Auth — secure REST API for AI agents</a>
        </li>
        <li>
          <a href="/docs/sdk/server">defineTool() — turn REST endpoint into AI tool</a>
        </li>
        <li>
          <a href="/docs/getting-started">Getting started — expose REST API to AI</a>
        </li>
      </ul>
    </DocPage>
  );
}
