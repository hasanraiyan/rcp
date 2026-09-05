/**
 * `responseMappings`: `{ fieldName: "@json.path" }` (RCP_SPEC.md §The
 * manifest). `@` starts every path; dot-separated segments walk the JSON
 * tree, numeric segments index arrays. A path that doesn't resolve returns
 * `undefined` for that field rather than failing the whole call.
 */
export function applyResponseMappings(
  data: unknown,
  mappings: Record<string, string> | undefined
): unknown {
  if (!mappings || Object.keys(mappings).length === 0) return data;

  const out: Record<string, unknown> = {};
  for (const [field, path] of Object.entries(mappings)) {
    out[field] = resolvePath(data, path);
  }
  return out;
}

function resolvePath(data: unknown, path: string): unknown {
  if (!path.startsWith('@')) return undefined;
  const segments = path.slice(1).split('.').filter(Boolean);

  let current: unknown = data;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) return undefined;
      current = current[index];
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
}
