/**
 * Generic `{{token}}` substitution for a tool's url/queryParams/headers/body.
 * No reserved token names here — RCP has no equivalent of a hardcoded
 * identity token; that's what resolvers (client.ts) exist for instead
 * (RCP_SPEC.md §Resolvers).
 */

const TOKEN_PATTERN = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

export class MissingTemplateValueError extends Error {}

/** Every `{{name}}` occurrence in a string, deduped, in first-seen order. */
export function extractTokenNames(text: string): string[] {
  if (typeof text !== 'string' || text.length === 0) return [];
  const names: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  TOKEN_PATTERN.lastIndex = 0;
  while ((match = TOKEN_PATTERN.exec(text)) !== null) {
    const name = match[1] as string;
    if (!seen.has(name)) {
      seen.add(name);
      names.push(name);
    }
  }
  return names;
}

/** Every token name referenced anywhere in a tool's templated fields. */
export function collectTokenNames(fields: {
  url?: string;
  queryParams?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
}): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  const add = (text: string) => {
    for (const name of extractTokenNames(text)) {
      if (!seen.has(name)) {
        seen.add(name);
        names.push(name);
      }
    }
  };

  if (fields.url) add(fields.url);
  for (const value of Object.values(fields.queryParams ?? {})) add(value);
  for (const value of Object.values(fields.headers ?? {})) add(value);
  collectTokensDeep(fields.body, add);

  return names;
}

function collectTokensDeep(value: unknown, add: (text: string) => void): void {
  if (typeof value === 'string') {
    add(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectTokensDeep(item, add);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectTokensDeep(item, add);
  }
}

/**
 * Renders one templated string. `values` must have an entry (even
 * `undefined`) for every token name in `text` — a token with no entry at
 * all is a caller bug, not a legitimate "missing value" case.
 */
export function renderTemplateString(text: string, values: Record<string, unknown>): string {
  if (typeof text !== 'string' || text.length === 0) return text ?? '';
  return text.replace(TOKEN_PATTERN, (_match, name: string) => {
    if (!Object.prototype.hasOwnProperty.call(values, name)) {
      throw new MissingTemplateValueError(
        `Template references {{${name}}}, but no value was resolved for it.`
      );
    }
    const value = values[name];
    return value === undefined || value === null ? '' : String(value);
  });
}

/** Renders every string in an arbitrary JSON value (for `body` templates). */
export function renderDeep(value: unknown, values: Record<string, unknown>): unknown {
  if (typeof value === 'string') return renderTemplateString(value, values);
  if (Array.isArray(value)) return value.map((item) => renderDeep(item, values));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = renderDeep(item, values);
    return out;
  }
  return value;
}

export function renderRecord(
  record: Record<string, string> | undefined,
  values: Record<string, unknown>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, template] of Object.entries(record ?? {})) {
    out[key] = renderTemplateString(template, values);
  }
  return out;
}
