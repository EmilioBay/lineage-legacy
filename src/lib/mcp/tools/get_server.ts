import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export default defineTool({
  name: "get_server",
  title: "Get L2 server detail",
  description:
    "Fetch full details for one approved server on L2Index, including name/domain history, yearly rankings, and lifetime vote count. Accepts the server UUID.",
  inputSchema: {
    server_id: z.string().uuid().describe("The server's UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ server_id }) => {
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: server } = await sb
      .from("servers")
      .select("*")
      .eq("id", server_id)
      .eq("status", "approved")
      .maybeSingle();
    if (!server) return { content: [{ type: "text", text: "Server not found" }], isError: true };
    const [{ data: nameHistory }, { data: domainHistory }, { data: yearly }, { count: lifetimeVotes }] =
      await Promise.all([
        sb.from("server_name_history").select("*").eq("server_id", server_id),
        sb.from("server_domain_history").select("*").eq("server_id", server_id),
        sb.from("yearly_rankings").select("*").eq("server_id", server_id),
        sb.from("votes").select("id", { count: "exact", head: true }).eq("server_id", server_id),
      ]);
    const payload = {
      server,
      name_history: nameHistory ?? [],
      domain_history: domainHistory ?? [],
      yearly_rankings: yearly ?? [],
      lifetime_votes: lifetimeVotes ?? 0,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
