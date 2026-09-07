import fs from "node:fs";
import * as yaml from "js-yaml";
import {
  RcpManifestSchema,
  SUPPORTED_RCP_VERSION,
  type RcpAuth,
  type RcpManifest,
  type RcpTool,
  type RcpToolParam,
} from "./schema.js";
import type { DiscoveredTool, RcpResolver } from "./client.js";

export interface OpenApiToRcpOptions {
  /** Include filter patterns (globs with `*`, e.g. `["list_*", "get_order"]`). */
  include?: string[];
  /** Exclude filter patterns (globs with `*`, e.g. `["admin_*", "internal_*"]`). */
  exclude?: string[];
  /** Param name -> resolver map. Bound params are removed from `exposedParams`. */
  resolvers?: Record<string, RcpResolver>;
  /** Optional override for base server URL (defaults to servers[0].url from OpenAPI spec or http://localhost). */
  serverUrl?: string;
  /** Manifest-level auth requirement override. */
  auth?: RcpAuth;
}

export interface OpenApiToRcpResult extends Iterable<DiscoveredTool> {
  manifest: RcpManifest;
  tools: DiscoveredTool[];
  [Symbol.iterator](): Iterator<DiscoveredTool>;
}

export type OpenApiInput = string | Record<string, unknown>;

function matchesPattern(text: string, pattern: string): boolean {
  if (pattern === "*") return true;
  if (pattern === text) return true;
  const regexPattern = "^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$";
  return new RegExp(regexPattern).test(text);
}

function shouldIncludeOperation(
  name: string,
  includePatterns?: string[],
  excludePatterns?: string[],
): boolean {
  if (excludePatterns && excludePatterns.length > 0) {
    if (excludePatterns.some((pattern) => matchesPattern(name, pattern))) {
      return false;
    }
  }
  if (includePatterns && includePatterns.length > 0) {
    return includePatterns.some((pattern) => matchesPattern(name, pattern));
  }
  return true;
}

function resolveRefs<T>(obj: T, root: Record<string, unknown>): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => resolveRefs(item, root)) as unknown as T;
  }

  const record = obj as Record<string, unknown>;
  if (typeof record.$ref === "string") {
    const refPath = record.$ref;
    if (refPath.startsWith("#/")) {
      const parts = refPath.slice(2).split("/");
      let current: unknown = root;
      for (const part of parts) {
        if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
          current = (current as Record<string, unknown>)[part];
        } else {
          return obj; // cannot resolve ref
        }
      }
      return resolveRefs(current as T, root);
    }
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(record)) {
    result[key] = resolveRefs(val, root);
  }
  return result as T;
}

function mapOpenApiTypeToRcpType(schemaType?: string): "string" | "number" | "boolean" {
  if (schemaType === "integer" || schemaType === "number") return "number";
  if (schemaType === "boolean") return "boolean";
  return "string";
}

function sanitizeOperationId(operationId?: string, method?: string, path?: string): string {
  if (operationId) {
    return operationId.replace(/[^a-zA-Z0-9_]/g, "_");
  }
  const cleanPath = path
    ? path
        .replace(/\{([^}]+)\}/g, "by_$1")
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "")
    : "";
  return `${method?.toLowerCase() || "tool"}_${cleanPath}`;
}

export async function openapiToRcp(
  input: OpenApiInput,
  options: OpenApiToRcpOptions = {},
): Promise<OpenApiToRcpResult> {
  let doc: Record<string, unknown>;

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const res = await fetch(trimmed);
      if (!res.ok) {
        throw new Error(`Failed to fetch OpenAPI spec from ${trimmed}: HTTP status ${res.status}`);
      }
      const text = await res.text();
      try {
        doc = JSON.parse(text);
      } catch {
        doc = yaml.load(text) as Record<string, unknown>;
      }
    } else if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      doc = JSON.parse(trimmed);
    } else if (fs.existsSync(trimmed)) {
      const content = fs.readFileSync(trimmed, "utf-8");
      try {
        doc = JSON.parse(content);
      } catch {
        doc = yaml.load(content) as Record<string, unknown>;
      }
    } else {
      // try parsing as YAML/JSON directly
      doc = yaml.load(trimmed) as Record<string, unknown>;
    }
  } else {
    doc = input;
  }

  if (!doc || typeof doc !== "object") {
    throw new Error("Invalid OpenAPI specification provided.");
  }

  // Dereference simple internal component schemas
  doc = resolveRefs(doc, doc);

  let baseUrl = options.serverUrl;
  if (!baseUrl && Array.isArray(doc.servers) && doc.servers.length > 0) {
    const firstServer = doc.servers[0] as { url?: string };
    if (firstServer?.url) {
      baseUrl = firstServer.url;
    }
  }
  if (!baseUrl) {
    baseUrl = "http://localhost";
  }
  baseUrl = baseUrl.replace(/\/+$/, "");

  const tools: RcpTool[] = [];
  const paths = (doc.paths as Record<string, Record<string, unknown>>) || {};
  const httpMethods = ["get", "post", "put", "patch", "delete"] as const;

  for (const [pathStr, pathItemObj] of Object.entries(paths)) {
    if (!pathItemObj || typeof pathItemObj !== "object") continue;

    const commonParams = Array.isArray(pathItemObj.parameters)
      ? (pathItemObj.parameters as Array<Record<string, unknown>>)
      : [];

    for (const method of httpMethods) {
      const op = pathItemObj[method] as Record<string, unknown> | undefined;
      if (!op) continue;

      const rawOperationId = op.operationId as string | undefined;
      const toolName = sanitizeOperationId(rawOperationId, method, pathStr);

      if (!shouldIncludeOperation(toolName, options.include, options.exclude)) {
        continue;
      }

      const description =
        (op.description as string) ||
        (op.summary as string) ||
        `${method.toUpperCase()} ${pathStr}`;

      let urlTemplate = `${baseUrl}${pathStr.replace(/\{([^}]+)\}/g, "{{$1}}")}`;

      const params: RcpToolParam[] = [];
      const queryParams: Record<string, string> = {};
      const headers: Record<string, string> = {};
      let bodyTemplate: Record<string, unknown> | undefined = undefined;

      const opParams = Array.isArray(op.parameters)
        ? (op.parameters as Array<Record<string, unknown>>)
        : [];
      const combinedParams = [...commonParams, ...opParams];

      for (const p of combinedParams) {
        if (!p || typeof p !== "object") continue;
        const name = p.name as string;
        const inWhere = p.in as string;
        const required = Boolean(p.required);
        const paramDesc = p.description as string | undefined;
        const schema = (p.schema as Record<string, unknown>) || {};
        const paramType = mapOpenApiTypeToRcpType(schema.type as string | undefined);

        if (!name) continue;

        params.push({
          name,
          type: paramType,
          ...(required ? { required: true } : { required: false }),
          ...(paramDesc ? { description: paramDesc } : {}),
        });

        if (inWhere === "query") {
          queryParams[name] = `{{${name}}}`;
        } else if (inWhere === "header") {
          headers[name] = `{{${name}}}`;
        }
      }

      // Handle requestBody
      if (op.requestBody && typeof op.requestBody === "object") {
        const reqBody = op.requestBody as Record<string, unknown>;
        const content = reqBody.content as Record<string, Record<string, unknown>> | undefined;
        const jsonContent = content?.["application/json"];

        if (jsonContent?.schema && typeof jsonContent.schema === "object") {
          const bodySchema = jsonContent.schema as Record<string, unknown>;
          const properties = (bodySchema.properties as Record<string, Record<string, unknown>>) || {};
          const requiredList = Array.isArray(bodySchema.required)
            ? (bodySchema.required as string[])
            : [];

          const bodyObj: Record<string, unknown> = {};

          for (const [propName, propSchema] of Object.entries(properties)) {
            const isReq = requiredList.includes(propName);
            const propDesc = propSchema.description as string | undefined;
            const propType = mapOpenApiTypeToRcpType(propSchema.type as string | undefined);

            // Add to tool params if not already added
            if (!params.some((p) => p.name === propName)) {
              params.push({
                name: propName,
                type: propType,
                required: isReq,
                ...(propDesc ? { description: propDesc } : {}),
              });
            }

            bodyObj[propName] = `{{${propName}}}`;
          }

          if (Object.keys(bodyObj).length > 0) {
            bodyTemplate = bodyObj;
          }
        }
      }

      tools.push({
        name: toolName,
        description,
        method: method.toUpperCase() as "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
        url: urlTemplate,
        params,
        ...(Object.keys(queryParams).length > 0 ? { queryParams } : {}),
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
        ...(bodyTemplate !== undefined ? { body: bodyTemplate } : {}),
      });
    }
  }

  const resolvers = options.resolvers ?? {};
  const discoveredTools: DiscoveredTool[] = tools.map((tool) => ({
    ...tool,
    exposedParams: tool.params.filter((param) => !(param.name in resolvers)),
  }));

  const manifest: RcpManifest = RcpManifestSchema.parse({
    rcpVersion: SUPPORTED_RCP_VERSION,
    auth: options.auth ?? { type: "none" },
    tools,
  });

  return {
    manifest,
    tools: discoveredTools,
    [Symbol.iterator]() {
      return discoveredTools[Symbol.iterator]();
    },
  };
}
