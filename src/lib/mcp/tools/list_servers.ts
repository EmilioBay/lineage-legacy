import { defineTool } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export default defineTool({
  name: "list_servers",
  title: "List L2 servers",
  description:
    "List approved Lineage 2 servers on L2Index with optional search across name, domain, chronicle, and rates. Returns basic listing info sorted by current-season votes.",
  inputSchema: {
    query: z
      .string()
      .trim()
      .max(100)
      .optional()
      .describe("Optional search term matched against name, domain, chronicle, rates."),
    limit: z.number().int().min(1).max(100).optional().describe("Max rows to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }) => {
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    let q = sb
      .from("servers")
      .select("id, current_name, chronicle, rates, country, domain, first_seen_at, launch_date, server_type")
      .eq("status", "approved");
    if (query) {
      const term = `%${query}%`;
      q = q.or(
        `current_name.ilike.${term},domain.ilike.${term},chronicle.ilike.${term},rates.ilike.${term}`,
      );
    }
    const { data, error } = await q.limit(limit ?? 25);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { servers: data ?? [] },
    };
  },
});
