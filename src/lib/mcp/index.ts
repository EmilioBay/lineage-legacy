import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listServersTool from "./tools/list_servers";
import getServerTool from "./tools/get_server";
import listMyServersTool from "./tools/list_my_servers";
import getCreditBalanceTool from "./tools/get_credit_balance";

// The OAuth issuer MUST point at the direct Supabase host, not the .lovable.cloud
// proxy. VITE_SUPABASE_PROJECT_ID is inlined by Vite at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "l2index-mcp",
  title: "L2Index MCP",
  version: "0.1.0",
  instructions:
    "Tools for L2Index — the Lineage 2 server directory. Read public server listings and details, and (for the signed-in user) inspect owned servers and Index Credits balance.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listServersTool, getServerTool, listMyServersTool, getCreditBalanceTool],
});
