/**
 * Role-neutral root export — just the wire schema/types shared by both
 * roles. Import `@rcp/sdk/client` if you're building the AI application,
 * or `@rcp/sdk/server` if you're exposing your own REST endpoints as tools.
 */
export {
  RcpAuthSchema,
  RcpToolParamSchema,
  RcpToolSchema,
  RcpManifestSchema,
  SUPPORTED_RCP_VERSION,
  type RcpAuth,
  type RcpToolParam,
  type RcpTool,
  type RcpManifest,
} from './schema.js';
