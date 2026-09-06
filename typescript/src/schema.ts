import { z } from "zod";

/**
 * The auth shape a manifest declares. Only describes *how* auth works —
 * never carries a credential (RCP_SPEC.md §Auth, §Security & trust).
 */
export const RcpAuthSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }),
  z.object({
    type: z.literal("header"),
    header: z.string().min(1).default("Authorization"),
    scheme: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal("oauth2"),
    resource: z.string().min(1),
  }),
]);
export type RcpAuth = z.infer<typeof RcpAuthSchema>;

export const RcpToolParamSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["string", "number", "boolean"]).default("string"),
  description: z.string().optional(),
  required: z.boolean().optional(),
});
export type RcpToolParam = z.infer<typeof RcpToolParamSchema>;

export const RcpToolSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  url: z.string().min(1),
  params: z.array(RcpToolParamSchema).default([]),
  queryParams: z.record(z.string(), z.string()).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
  // A tool MAY override the manifest's own top-level auth (RCP_SPEC.md
  // §The manifest). The reference client in this package does not yet
  // implement per-tool auth overrides — see client.ts's `call()`.
  auth: RcpAuthSchema.optional(),
  responseMappings: z.record(z.string(), z.string()).optional(),
});
export type RcpTool = z.infer<typeof RcpToolSchema>;

export const RcpManifestSchema = z.object({
  rcpVersion: z.string().min(1),
  auth: RcpAuthSchema.default({ type: "none" }),
  tools: z.array(RcpToolSchema).max(200),
});
export type RcpManifest = z.infer<typeof RcpManifestSchema>;

/** The only manifest version this package understands (RCP_SPEC.md §Versioning). */
export const SUPPORTED_RCP_VERSION = "0.1";
