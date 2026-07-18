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
  name: "get_credit_balance",
  title: "Get Index Credits balance",
  description:
    "Return the current Index Credits balance and the last 20 credit transactions for the signed-in L2Index user.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const sb = supabaseForUser(ctx);
    const userId = ctx.getUserId()!;
    const [{ data: tokens }, { data: txs }] = await Promise.all([
      sb.from("user_tokens").select("balance").eq("user_id", userId).maybeSingle(),
      sb
        .from("token_transactions")
        .select("amount, type, description, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    const payload = { balance: tokens?.balance ?? 0, transactions: txs ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: payload,
    };
  },
});
