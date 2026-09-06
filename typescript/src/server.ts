import { z } from "zod";
import type { RcpTool, RcpToolParam } from "./schema.js";

type AnyZodObject = z.ZodObject<z.ZodRawShape>;
type ArgKeys<TArgs> = TArgs extends AnyZodObject ? Extract<keyof z.infer<TArgs>, string> : never;

export interface TemplateHelpers<TArgKeys extends string> {
  /** References one of `args`' own fields, expands to `{{name}}`. */
  arg(name: TArgKeys): string;
}

type TemplateValue<TArgKeys extends string> = string | ((t: TemplateHelpers<TArgKeys>) => string);

export interface DefineToolOptions<TArgs extends AnyZodObject | undefined = undefined> {
  name: string;
  description: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Declares the model-fillable arguments; each field becomes one `params` entry. */
  args?: TArgs;
  url: TemplateValue<ArgKeys<TArgs>>;
  queryParams?: Record<string, TemplateValue<ArgKeys<TArgs>>>;
  headers?: Record<string, TemplateValue<ArgKeys<TArgs>>>;
  body?:
    Record<string, unknown> | ((t: TemplateHelpers<ArgKeys<TArgs>>) => Record<string, unknown>);
  responseMappings?: Record<string, string>;
}

/**
 * Builds one manifest tool entry in code, for a server to include in its
 * `{ rcpVersion, auth, tools }` response. Never talks to the network itself
 * — see examples/basic/server.ts for wiring the result into an actual
 * manifest endpoint.
 */
export function defineTool<TArgs extends AnyZodObject | undefined = undefined>(
  options: DefineToolOptions<TArgs>,
): RcpTool {
  const t: TemplateHelpers<ArgKeys<TArgs>> = {
    arg: (name) => `{{${String(name)}}}`,
  };

  const url = typeof options.url === "function" ? options.url(t) : options.url;
  const queryParams = renderMapOption(options.queryParams, t);
  const headers = renderMapOption(options.headers, t);
  const body = typeof options.body === "function" ? options.body(t) : options.body;
  const params: RcpToolParam[] = options.args ? zodShapeToParams(options.args) : [];

  return {
    name: options.name,
    description: options.description,
    method: options.method,
    url,
    params,
    queryParams,
    headers,
    body,
    responseMappings: options.responseMappings,
  };
}

function renderMapOption<TKeys extends string>(
  map: Record<string, TemplateValue<TKeys>> | undefined,
  t: TemplateHelpers<TKeys>,
): Record<string, string> | undefined {
  if (!map) return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(map)) {
    out[key] = typeof value === "function" ? value(t) : value;
  }
  return out;
}

function zodShapeToParams(schema: AnyZodObject): RcpToolParam[] {
  return Object.entries(schema.shape).map(([name, fieldSchema]) => {
    const field = fieldSchema as z.ZodTypeAny;
    const { type, required } = introspect(field);
    const param: RcpToolParam = { name, type, required };
    if (field.description) param.description = field.description;
    return param;
  });
}

function introspect(schema: z.ZodTypeAny): {
  type: "string" | "number" | "boolean";
  required: boolean;
} {
  const required = !schema.isOptional();

  let base: z.ZodTypeAny = schema;
  while (
    base instanceof z.ZodOptional ||
    base instanceof z.ZodDefault ||
    base instanceof z.ZodNullable
  ) {
    base =
      base instanceof z.ZodDefault
        ? (base._def.innerType as z.ZodTypeAny)
        : (base.unwrap() as z.ZodTypeAny);
  }

  if (base instanceof z.ZodNumber) return { type: "number", required };
  if (base instanceof z.ZodBoolean) return { type: "boolean", required };
  return { type: "string", required };
}
