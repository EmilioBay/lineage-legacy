import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import type { Database } from "@/integrations/supabase/types";

function supabaseForUser(ctx: ToolContext) {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "list_my_servers",
  title: "List my L2 servers",
  description:
    "List servers owned by the currently signed-in L2Index user, with status (pending, approved, changes_requested, rejected) and current-season vote counts.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    const { data: servers, error } = await sb
      .from("servers")
      .select("id, current_name, status, chronicle, rates, domain, launch_date, created_at")
      .eq("owner_id", ctx.getUserId()!)
      .order("created_at", { ascending: false });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(servers ?? []) }],
      structuredContent: { servers: servers ?? [] },
    };
  },
});
